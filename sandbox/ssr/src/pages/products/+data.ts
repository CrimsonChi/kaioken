import type { PageContextServer } from "vike/types"
import { redirect } from "vike/abort"

export { data, type ServerProps }

type ServerProps = Awaited<ReturnType<typeof data>>

const data = async (pageContext: PageContextServer) => {
  const search = pageContext.urlParsed.search

  const pageSize = 5
  let page = 1
  if ("page" in search) {
    page = parseInt(search.page)
    if (isNaN(page)) throw redirect("/users")
  }
  if (page < 1) {
    page = 1
  }

  const response = await fetch(
    `https://dummyjson.com/products?skip=${(page - 1) * pageSize}&limit=${pageSize}&select=title,thumbnail`
  )
  const { products } = (await response.json()) as {
    products: Product[]
  }
  return { products }
}

type Product = {
  id: number
  title: string
  thumbnail: string
}
