import md5 from "md5"
import moment from "moment"
import { NextApiRequest, NextApiResponse } from "next"
import Pusher from "pusher"
import * as querystring from "querystring"
import { config } from "../../src/config/config"
import {
  LogLevel,
  LogMessage,
} from "../../src/ExportToMailChimp/models/LogMessage"
import { MailChimpCreateMemberError } from "../../src/ExportToMailChimp/models/MailChimpCreateMemberError"
import { MailChimpMember } from "../../src/ExportToMailChimp/models/MailChimpMember"
import { MailChimpMergeFields } from "../../src/ExportToMailChimp/models/MailChimpMergeFields"
import { MailChimpTag } from "../../src/ExportToMailChimp/models/MailChimpTag"
import { AddTagResponse } from "../../src/ExportToMailChimp/models/populi/AddTagResponse"
import {
  Address,
  Email,
  GetPersonResponse,
  Person,
  PopuliTag,
} from "../../src/ExportToMailChimp/models/populi/GetPersonResponse"
import {
  GetUpdatedPeopleResponse,
  UpdatedPerson,
} from "../../src/ExportToMailChimp/models/populi/GetUpdatedPeopleResponse"
import { Progress } from "../../src/ExportToMailChimp/models/Progress"
import { populiRegionTags } from "../../src/ExportToMailChimp/populiRegionTags"
import { ExportToMailChimpRequest } from "../../src/ExportToMailChimp/useExportToMailChimp"
import { xml2json } from "../../src/server/xml2Json"

const pusher = new Pusher({
  appId: "1313288",
  key: config.pusher.key,
  secret: process.env.PUSHER_SECRET || "PUSHER_SECRET", // todo - put in env secure
  cluster: config.pusher.cluster,
  useTLS: true,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    log("Starting...")

    const params: ExportToMailChimpRequest = req.body

    // await new Promise((resolve) => setTimeout(resolve, 1000))
    try {
      await exportPopuliToMailChimp(params)
      log("Finished!")
      res.status(204).json(null)
    } catch (e: any) {
      log("Failed!", "error")
      log(e.message, "error")
    }
  } else {
    res.status(400).json({
      message: "Invalid endpoint usage",
    })
  }
}

let messageId = 0
function log(message: string, level: LogLevel = "info") {
  messageId++
  const logMessage: LogMessage = {
    messageId,
    message,
    level,
  }
  pusher.trigger(config.pusher.channel, "log", logMessage)
}

let progressId = 0
function setProgress(value: number) {
  progressId++
  const progress: Progress = {
    progressId,
    value,
  }
  pusher.trigger(config.pusher.channel, "progress", progress)
}

async function exportPopuliToMailChimp({
  skip,
  queryUpdatesAfter,
  populiApiKey,
  mailChimpApiKey,
  mailChimpListId,
}: ExportToMailChimpRequest) {
  try {
    const startTime = moment().toISOString()

    let keepGoing = true
    let peopleCount = 0

    let offset = Number(skip)

    while (keepGoing) {
      // FETCH UPDATED PEOPLE IN POPULI
      log(
        `Fetching updated people since \`${moment(
          queryUpdatesAfter
        ).fromNow()}\` with offset \`${offset}\`...`
      )

      const response = await fetch(
        `https://montessorinorthwest.populiweb.com/api/?${querystring.stringify(
          {
            task: "getUpdatedPeople",
            start_time: moment(queryUpdatesAfter).format("YYYY-MM-DD HH:mm:ss"),
            offset,
          }
        )}`,
        {
          method: "post",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: populiApiKey,
          },
        }
      ).then(async (resp) => {
        if (resp.ok) {
          return xml2json<GetUpdatedPeopleResponse>(await resp.text())
        } else {
          throw Error(
            `Failed **Populi** API request \`getUpdatedPeople\` with status \`${resp.status} ${resp.statusText}\``
          )
        }
      })

      log(JSON.stringify(response), "debug")

      let updatedPeople: UpdatedPerson[] = []
      if (response.response.person !== undefined) {
        updatedPeople = Array.isArray(response.response.person)
          ? response.response.person
          : [response.response.person]
      }

      if (updatedPeople.length > 0) {
        log(
          `Processing \`${offset + 1} - ${offset + updatedPeople.length} of ${
            response.response.$.num_results
          }\``
        )
        for (let i = 0; i < updatedPeople.length; i++) {
          const p = updatedPeople[i]
          peopleCount++
          setProgress(
            100 * (peopleCount / Number(response.response.$.num_results))
          )
          // FETCH MORE DETAILS IN POPULI
          log(`Fetching details on \`${p.first_name}\` \`${p.last_name}\``)
          const personResponse = await fetch(
            `https://montessorinorthwest.populiweb.com/api/?${querystring.stringify(
              {
                task: "getPerson",
                person_id: p.id,
              }
            )}`,
            {
              method: "post",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: populiApiKey,
              },
            }
          ).then(async (resp) => {
            if (resp.ok) {
              return xml2json<GetPersonResponse>(await resp.text())
            } else {
              throw Error(
                `Failed **Populi** API request \`getPerson\` with status \`${resp.status} ${resp.statusText}\``
              )
            }
          })
          log(JSON.stringify(personResponse), "debug")

          // LOOP EACH EMAIL ADDRESS
          const { response: person } = personResponse
          // UPDATE RECORD IN POPULI IF NEEDED
          await processPopuliPerson(p.id, person, populiApiKey)
          // MAILCHIMP
          try {
            await processMailChimpPerson(
              person,
              mailChimpApiKey,
              mailChimpListId
            )
          } catch (err: any) {
            log(err.message, "error")
            log(`**Skipping over error...**`)
          }
        }
        offset += updatedPeople.length
        keepGoing = updatedPeople.length > 0
      } else {
        log("*No more results*")
        keepGoing = false
      }
    }
  } catch (e: any) {
    log(e.message)
  }
}

// POPULI UPDATES
async function processPopuliPerson(
  personId: number,
  person: Person,
  populiApiKey: string
) {
  const addresses: Address[] = Array.isArray(person.address)
    ? person.address
    : person.address === undefined
    ? []
    : [person.address]

  // get unique list of states
  const states = Array.from(
    new Set(
      addresses
        .map((adr) => adr.state)
        .filter((x) => x !== undefined && x !== null && x !== "")
    )
  )

  // get unique list of countries
  const countries = Array.from(
    new Set(
      addresses
        .map((adr) => adr.country)
        .filter((x) => x !== undefined && x !== null && x !== "")
    )
  )

  // get uniqe zip codes
  const zips = Array.from(
    new Set(
      addresses
        .map((adr) => adr.zip)
        .filter((x) => x !== undefined && x !== null && x !== "")
    )
  )

  const regionTagNames: string[] = []
  populiRegionTags.forEach((prt) => {
    // tag from zip
    if (
      prt.zips !== undefined &&
      prt.zips.filter((value) => zips.indexOf(String(value)) > 0).length > 0
    ) {
      regionTagNames.push(prt.tag)
    }
    // tag from countries
    if (prt.testCountries !== undefined && prt.testCountries(countries)) {
      regionTagNames.push(prt.tag)
    }
    // tag from states
    if (
      prt.states !== undefined &&
      prt.states.filter((value) => states.indexOf(value) > 0).length > 0
    ) {
      regionTagNames.push(prt.tag)
    }
  })

  const populiTags: PopuliTag[] = Array.isArray(person.tags.tag)
    ? person.tags.tag
    : person.tags.tag !== undefined
    ? [person.tags.tag]
    : []

  const addTags: string[] = regionTagNames.filter(
    (x) => populiTags.filter((y) => y.name === x).length === 0
  )

  // TODO create removeTags array to cleanup incorrect regions

  log(`addTags = ${JSON.stringify(addTags)}`, "debug")

  if (addTags.length > 0) {
    log(
      `Applying Populi tags to \`${person.first} ${person.last}\`: ${addTags
        .map((x) => `\`${x}\``)
        .join(", ")}`
    )

    for (let i = 0; i < addTags.length; i++) {
      const response = await fetch(
        `https://montessorinorthwest.populiweb.com/api/?${querystring.stringify(
          {
            task: "addTag",
            person_id: personId,
            tag: addTags[i],
          }
        )}`,
        {
          method: "post",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: populiApiKey,
          },
        }
      ).then(async (resp) => {
        if (resp.ok) {
          return xml2json<AddTagResponse>(await resp.text())
        } else {
          throw Error(
            `Failed **Populi** API request \`addTag\` with status \`${resp.status} ${resp.statusText}\``
          )
        }
      })
    }
  }
}

// MAILCHIMP ADD / UPDATE
async function processMailChimpPerson(
  person: Person,
  mailChimpApiKey: string,
  mailChimpListId: string
) {
  //   log(`processMailChimpPerson ${JSON.stringify(person)}`)

  const headers = new Headers()
  headers.set(
    "Authorization",
    `Basic ${Buffer.from("any:" + mailChimpApiKey).toString("base64")}`
  )

  const emails: Email[] = Array.isArray(person.email)
    ? person.email
    : person.email !== undefined
    ? [person.email]
    : []

  for (let j = 0; j < emails.length; j++) {
    // LOOKUP IN MAILCHIMP
    let mcMember = await fetch(
      `https://us7.api.mailchimp.com/3.0/lists/${mailChimpListId}/members/${md5(
        emails[j].address.toLowerCase()
      )}`,
      {
        method: "get",
        headers,
      }
    ).then(async (resp) => {
      if (resp.status === 404) {
        return null
      }
      if (resp.ok) {
        return resp.json() as Promise<MailChimpMember>
      } else {
        throw Error(
          `Failed **MailChimp** API request: \`${await resp.text()}\``
        )
      }
    })

    // CREATE NEW MAILCHIMP MEMBER
    if (mcMember === null && emails[j].no_mailings !== true) {
      log(`Adding missing email \`${emails[j].address}\` to MailChimp...`)
      mcMember = await fetch(
        `https://us7.api.mailchimp.com/3.0/lists/${mailChimpListId}/members`,
        {
          method: "post",
          headers,
          body: JSON.stringify({
            email_address: emails[j].address,
            status: "subscribed",
          }),
        }
      ).then(async (resp) => {
        if (resp.ok) {
          return resp.json() as Promise<MailChimpMember>
        } else {
          const err: MailChimpCreateMemberError = await resp.json()
          throw Error(
            `**${err.title}** - ${err.detail} You submitted \`${emails[j].address}\``
          )
        }
      })
    }

    // now lets make sure mcMember data is up2date
    if (mcMember !== null) {
      let doUpdate = false
      const merge_fields: MailChimpMergeFields = {
        FNAME: "",
        LNAME: "",
      }
      // update first/last name
      if (person.first !== mcMember.merge_fields.FNAME) {
        merge_fields.FNAME = person.first
        doUpdate = true
      }
      if (person.last !== mcMember.merge_fields.LNAME) {
        merge_fields.LNAME = person.last
        doUpdate = true
      }
      if (doUpdate) {
        log(
          `Updating name from \`${mcMember.merge_fields.FNAME} ${mcMember.merge_fields.LNAME}\` to  \`${merge_fields.FNAME} ${merge_fields.LNAME}\``
        )
        mcMember = await fetch(
          `https://us7.api.mailchimp.com/3.0/lists/${mailChimpListId}/members/${mcMember.id}`,
          {
            method: "patch",
            headers,
            body: JSON.stringify({
              merge_fields,
            }),
          }
        ).then(async (resp) => {
          if (resp.ok) {
            return resp.json() as Promise<MailChimpMember>
          } else {
            const err: MailChimpCreateMemberError = await resp.json()
            throw Error(
              `**${err.title}** - ${err.detail} You submitted \`${emails[j].address}\``
            )
          }
        })
      }

      // update tags
      const populiTags: PopuliTag[] = Array.isArray(person.tags.tag)
        ? person.tags.tag
        : person.tags.tag !== undefined
        ? [person.tags.tag]
        : []

      const tags: MailChimpTag[] = []
      populiTags.forEach((x) => {
        if (mcMember?.tags.find((y) => y.name === x.name) === undefined) {
          tags.push({ name: x.name, status: "active" })
        }
      })
      if (tags.length > 0 && mcMember !== null) {
        log(
          `Applying tags to \`${mcMember?.email_address}\`: ${tags
            .map((x) => `\`${x.name}\``)
            .join(", ")}`
        )
        const r = await fetch(
          `https://us7.api.mailchimp.com/3.0/lists/${mailChimpListId}/members/${mcMember.id}/tags`,
          {
            method: "post",
            headers,
            body: JSON.stringify({ tags }),
          }
        )
      }
    }
  }
}
