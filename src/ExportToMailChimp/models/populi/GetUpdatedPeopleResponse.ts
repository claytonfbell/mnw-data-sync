export interface GetUpdatedPeopleResponse {
  response: Response
}

interface Response {
  $: { num_results: string }
  person?: UpdatedPerson[] | UpdatedPerson
}

export interface UpdatedPerson {
  id: number
  first_name: string
  last_name: string
  preferred_name: string
  middle_name: string
  prefix: string
  suffix: string
  former_name: string
  maiden_name: string
  gender: string
  birth_date: string
  status: string
  user_name: string
  updated_at: string
}
