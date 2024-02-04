import { loadProduct } from "../api"
import { registerPage } from "../pageData"
import { Product } from "../types"

console.log("ProductView module")

export default function ProductView({ data }: { data: Product }) {
  return (
    <div>
      <h1>{data.title}</h1>
      <img src={data.thumbnail} />
      {data.id > 1 && <a href={`/products/${data.id - 1}`}>Prev</a>}
      <a href={`/products/${data.id + 1}`}>Next</a>
    </div>
  )
}

if (import.meta.env.SSR) {
  registerPage(
    "/products/:id",
    async ({ params: { id } }) => {
      const product = await loadProduct(id)
      return {
        title: product.title,
        data: { product },
      }
    },
    ProductView
  )
}
