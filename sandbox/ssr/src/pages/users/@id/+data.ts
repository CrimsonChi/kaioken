import { redirect } from "vike/abort"
import type { PageContextServer } from "vike/types"

export { data, type ServerProps }

type ServerProps = Awaited<ReturnType<typeof data>>

const data = async (pageContext: PageContextServer) => {
  const { id } = pageContext.routeParams
  const userId = parseInt(id)
  if (isNaN(userId)) throw redirect("/users")
  const response = await fetch(`https://dummyjson.com/users/${userId}`)
  const user = (await response.json()) as UserData
  return { user }
}

type UserData = {
  id: number
  firstName: string
  lastName: string
  age: number
  gender: string
  email: string
  image: string
  address: {
    address: string
    city: string
    coordinates: { lat: number; lng: number }
    postalCode: string
    state: string
  }
}
