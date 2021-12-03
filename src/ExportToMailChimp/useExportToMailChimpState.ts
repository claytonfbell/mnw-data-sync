import moment from "moment"
import { useEffect, useState } from "react"
import { useMutation, useQuery } from "react-query"
import { useDebounce } from "react-use"
import rest, { RestError } from "./rest"
import { ExportToMailChimpRequest } from "./useExportToMailChimp"

function useFetchSession() {
  return useQuery<ISessionData, RestError>(["session"], () =>
    rest.get(`/session`)
  )
}

export interface ISessionData {
  exportToMailChimp: ExportToMailChimpRequest
}

function useUpdateSession() {
  return useMutation<void, RestError, ISessionData>((params) =>
    rest.put(`/session`, params)
  )
}

export function useExportToMailChimpState() {
  const { data: session } = useFetchSession()
  const { mutateAsync: updateSession } = useUpdateSession()
  const [fetched, setFetched] = useState(false)
  const [state, setState] = useState<ExportToMailChimpRequest>({
    populiApiKey: "",
    mailChimpApiKey: "",
    mailChimpListId: "42d5e0fcba",
    queryUpdatesAfter: moment().toISOString(),
    skip: 0,
  })

  // load state from server only once
  useEffect(() => {
    if (session !== undefined && !fetched) {
      setFetched(true)
      setState(session.exportToMailChimp)
    }
  }, [fetched, session])

  // push state to server when mutated
  useDebounce(
    () => {
      updateSession({ ...session, exportToMailChimp: state })
    },
    1000,
    [session, state, updateSession]
  )

  return { state, setState }
}
