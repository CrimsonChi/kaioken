import { Link, RouteChildProps, useCallback, useQuery } from "reflex-ui"
import { Spinner } from "./Spinner"

interface Product {
  title: string
  thumbnail: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function Product({ query }: RouteChildProps) {
  const { id } = query
  const handleFetchProduct = useCallback(async () => {
    return fetch(`https://dummyjson.com/products/${id}`)
      .then((res) => res.json())
      .then(async (data) => {
        await sleep(1000)
        return data as Product
      })
  }, [id])

  const { loading, error, data } = useQuery<Product>(handleFetchProduct, [
    "products",
    id,
  ])

  if (loading) return <Spinner />
  if (error) return <div>{error.message}</div>
  if (!data) return null

  return (
    <>
      <div>
        <h3>{data.title}</h3>
        <img src={data.thumbnail} />
      </div>
      <div>
        {id > 1 && <Link to={`/query?id=${Number(id) - 1}`}>Back</Link>}
        <Link to={`/query?id=${Number(id) + 1}`}>Next</Link>
      </div>
    </>
  )
}
