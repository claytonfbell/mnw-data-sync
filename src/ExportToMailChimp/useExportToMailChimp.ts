import { useMutation } from "react-query"
import rest, { RestError } from "./rest"

export interface ExportToMailChimpRequest {
  populiApiKey: string
  mailChimpApiKey: string
  mailChimpListId: string
  queryUpdatesAfter: string
  skip: number
}

export function useExportToMailChimp() {
  return useMutation<void, RestError, ExportToMailChimpRequest>((params) =>
    rest.post("/mailchimp", params)
  )
}
