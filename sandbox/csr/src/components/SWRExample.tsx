import { useState } from "kaioken"
import { useSWR } from "kaioken/swr"

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

const fetcher = async (path: string) => {
  const res = await fetch(`https://dummyjson.com/${path}`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

const useProduct = (id: number) => useSWR<Product>(`products/${id}`, fetcher)

export default function SWRExample() {
  const [productId, setProductId] = useState(1)
  return (
    <div>
      <h1>SWR Example</h1>
      <button onclick={() => setProductId((prev) => prev - 1)}>Prev</button>
      <button onclick={() => setProductId((prev) => prev + 1)}>Next</button>
      <ProductImage id={productId} />
      <ProductTitle id={productId} />
    </div>
  )
}

function ProductImage({ id }: { id: number }) {
  const { data, isLoading, error } = useProduct(id)

  console.log("render product image", id)
  if (isLoading) return <p>Loading...</p>
  if (error) return <p>{error.message}</p>
  return (
    <>
      <img src={data.thumbnail} />
      <p>{data.stock} in stock!</p>
    </>
  )
}

function ProductTitle({ id }: { id: number }) {
  const { data, isLoading, error, mutate, isMutating } = useProduct(id)

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>{error.message}</p>

  const updateName = async (name: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const res = await fetch(`https://dummyjson.com/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name, stock: data.stock + 1 }),
    })
    return await res.json()
  }

  return (
    <>
      <input
        value={data.title}
        onchange={(e) => mutate(() => updateName(e.target.value))}
        disabled={isMutating}
      />
      {isMutating && <p>Saving...</p>}
    </>
  )
}
