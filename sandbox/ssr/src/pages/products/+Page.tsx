import { PageTitle } from "$/components/PageTitle"
import type { ServerProps } from "./+data"

export function Page({ products }: ServerProps) {
  return (
    <>
      <PageTitle>Products</PageTitle>
      <div>
        {products.map((product) => (
          <ProductCard product={product} />
        ))}
      </div>
    </>
  )
}

function ProductCard({
  product,
}: {
  product: ServerProps["products"][number]
}) {
  return (
    <div className="flex flex-col gap-2 mb-2 pb-2 items-center border-b-2 border-white border-opacity-5 last:border-b-0">
      <img src={product.thumbnail} />
      <h2>{product.title}</h2>
    </div>
  )
}
