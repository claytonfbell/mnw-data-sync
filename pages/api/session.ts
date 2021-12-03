import moment from "moment"
import { NextApiResponse } from "next"
import { ISessionData } from "../../src/ExportToMailChimp/useExportToMailChimpState"
import { buildResponse } from "../../src/server/buildResponse"
import withSession, { NextIronRequest } from "../../src/server/session"

async function handler(req: NextIronRequest, res: NextApiResponse) {
  buildResponse(res, async () => {
    if (req.method === "GET") {
      let data: ISessionData | undefined | null = req.session.get("data")
      if (data === undefined || data === null) {
        data = {
          exportToMailChimp: {
            populiApiKey: "",
            mailChimpApiKey: "",
            mailChimpListId: "42d5e0fcba",
            queryUpdatesAfter: moment().toISOString(),
            skip: 0,
          },
        }
      }
      return data
    } else if (req.method === "PUT") {
      req.session.set("data", req.body)
      await req.session.save()
      return req.body
    }
  })
}
export default withSession(handler)
