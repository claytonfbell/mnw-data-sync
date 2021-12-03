import { NextApiRequest, NextApiResponse } from "next"
import * as querystring from "querystring"
import { GetAccessKey } from "../../../src/ExportToMailChimp/models/populi/GetAccessKey"
import { PopuliError } from "../../../src/ExportToMailChimp/models/populi/PopuliError"
import { CreatePopuliApiKeyRequest } from "../../../src/ExportToMailChimp/useCreatePopuliApiKey"
import withSession from "../../../src/server/session"
import { xml2json } from "../../../src/server/xml2Json"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username, password }: CreatePopuliApiKeyRequest = req.body

  if (req.method !== "POST") {
    res.status(400).json({ message: "Invalid request" })
    return
  }

  try {
    // throw Error(JSON.stringify({ username, password }))
    const body = querystring.stringify({
      username,
      password,
    })

    const response = await fetch(
      `https://montessorinorthwest.populiweb.com/api/`,
      {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      }
    ).then(async (resp) => {
      if (resp.ok) {
        return xml2json<GetAccessKey>(await resp.text())
      } else {
        // throw Error(await resp.text())
        throw Error(
          (await xml2json<PopuliError>(await resp.text())).error.message
        )
      }
    })
    // throw Error(JSON.stringify(response.response))

    res.status(200).json(response)
  } catch (e: any) {
    res.status(400).json({ status: 400, message: e.message })
  }
}

export default withSession(handler)
