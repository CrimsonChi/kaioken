import { useAsync, useState } from "kaioken"

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

  const data = useAsync(async () => {
    const res = await fetch(`https://dummyjson.com/products/${productId}`)
    await new Promise((res) => setTimeout(res, Math.random() * 3000))
    return res.json() as Promise<Product>
  }, [productId])

  console.log("data", data)

  return (
    <div>
      <button onclick={() => setProductId((prev) => prev + 1)}>Next</button>
      {data ? <ProductCard product={data} /> : <p>Loading...</p>}
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
