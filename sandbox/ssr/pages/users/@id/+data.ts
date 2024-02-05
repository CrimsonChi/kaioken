import type { DataAsync } from "vike/types"

export type { ServerProps, AddressData }
export { data }

const data: DataAsync<ServerProps["data"]> = async (pageContext) => {
  const { id: userId } = pageContext.routeParams
  const response = await fetch(`https://dummyjson.com/users/${userId}`)
  const user = (await response.json()) as UserData
  return { user }
}

type ServerProps = {
  data: { user: UserData }
}

type AddressData = {
  address: string
  city: string
  coordinates: { lat: number; lng: number }
  postalCode: string
  state: string
}

type UserData = {
  id: number
  firstName: string
  lastName: string
  age: number
  gender: string
  email: string
  image: string
  address: AddressData
}
