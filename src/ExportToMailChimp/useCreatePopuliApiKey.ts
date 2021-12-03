import { useMutation } from "react-query"
import { GetAccessKey } from "./models/populi/GetAccessKey"
import rest, { RestError } from "./rest"

export interface CreatePopuliApiKeyRequest {
  username: string
  password: string
}

export function useCreatePopuliApiKey() {
  return useMutation<GetAccessKey, RestError, CreatePopuliApiKeyRequest>(
    (params) => rest.post(`/populi/apiKey`, params)
  )
}
