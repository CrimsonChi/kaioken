import type { PageContextServer } from "vike/types"
import { redirect } from "vike/abort"

export { data, type ServerProps }

type ServerProps = Awaited<ReturnType<typeof data>>

const data = async (pageContext: PageContextServer) => {
  const search = pageContext.urlParsed.search

  const pageSize = 20
  let page = 1
  if ("page" in search) {
    page = parseInt(search.page)
    if (isNaN(page)) throw redirect("/users")
  }
  if (page < 1) {
    page = 1
  }

  const response = await fetch(
    `https://dummyjson.com/users?limit=${pageSize}&skip=${(page - 1) * pageSize}&select=id,firstName,lastName,image`
  )
  const { users } = (await response.json()) as {
    users: UserData[]
  }
  return { users, page }
}

type UserData = {
  id: number
  firstName: string
  lastName: string
  image: string
}
