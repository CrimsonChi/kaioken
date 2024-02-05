import type { DataAsync } from "vike/types"

export const data: DataAsync<UserData> = async (pageContext) => {
  const { id: userId } = pageContext.routeParams
  const response = await fetch(`https://dummyjson.com/users/${userId}`)
  return (await response.json()) as Promise<UserData>
}

export type UserData = {
  id: number
  firstName: string
  lastName: string
  age: number
  gender: string
  email: string
  image: string
  address: AddressData
}

export type AddressData = {
  address: string
  city: string
  coordinates: { lat: number; lng: number }
  postalCode: string
  state: string
}
