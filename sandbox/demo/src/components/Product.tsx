import { useQuery } from "reflex-ui"
import { Spinner } from "./Spinner"

interface Product {
  title: string
  thumbnail: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const fetchProduct = (id: string) =>
  fetch(`https://dummyjson.com/products/${id}`)
    .then((res) => res.json())
    .then(async (data) => {
      await sleep(1000)
      return data
    })

export function Product() {
  const { data, error, loading } = useQuery<Product>(
    () => fetchProduct("1"),
    ["products", "1"]
  )

  return (
    <>
      {loading && <Spinner />}
      {error && <div>{error.message}</div>}
      {data && (
        <div>
          <h3>{data.title}</h3>
          <img src={data.thumbnail} />
        </div>
      )}
    </>
  )
}
