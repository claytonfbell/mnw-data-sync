export interface GetPersonResponse {
  response: Person
}

export interface Person {
  first: string
  last: string
  middle_name: string
  preferred_name: string
  prefix: string
  former_name: string
  timezone: string
  timezone_name: string
  email: Email | Email[]
  address?: Address | Address[]
  phone: Phone[]
  gender: string
  tags: PopuliTags
}

export interface Email {
  emailid: number
  type: string
  address: string
  is_primary: boolean
  no_mailings: boolean
}

export interface Address {
  addressid: number
  type: string
  street: string
  city: string
  state: string
  zip: string
  country: string
  is_primary: boolean
}

interface Phone {
  phoneid: number
  type: string
  number: string
  is_primary: boolean
}

interface PopuliTags {
  tag: PopuliTag[] | PopuliTag
}

export interface PopuliTag {
  id: number
  name: string
  system: string
}
