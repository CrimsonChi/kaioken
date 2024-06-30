import { useAsync, useState } from "kaioken"
import { Spinner } from "./atoms/Spinner"
import { Button } from "./atoms/Button"

interface Product {
  id: number
  title: string
  description: string
  price: number
  discountPercentage: number
  rating: number
  stock: number
  brand: string
  category: string
  thumbnail: string
  images: string[]
}

export function UseAsyncExample() {
  const [productId, setProductId] = useState(1)

  const { data, loading, error } = useAsync<Product>(async () => {
    const res = await fetch(`https://dummyjson.com/products/${productId}`).then(
      (r) => r.json()
    )
    if ("message" in res) throw res.message
    return res
  }, [productId])

  console.log("result", data)

  return (
    <div>
      <Button onclick={() => setProductId((prev) => prev + 1)}>
        Next ({productId})
      </Button>
      {data ? (
        <ProductCard product={data} />
      ) : loading ? (
        <Spinner />
      ) : (
        <p>{error.message}</p>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <h1>
        {product.title} <sup>({product.id})</sup>
      </h1>
      <p>{product.description}</p>

      <img src={product.thumbnail} />
    </div>
  )
}
