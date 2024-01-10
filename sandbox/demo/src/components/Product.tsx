import { Link, RouteChildProps, memo, useFetch, useState } from "kaioken"
import { Spinner } from "./Spinner"

interface Product {
  title: string
  thumbnail: string
}

export const ProductPage = (props: RouteChildProps) => {
  const { id } = props.query
  const [count, setCount] = useState(0)

  const { loading, error, data } = useFetch<Product>(
    `https://dummyjson.com/products/${id}`
  )

  return (
    <>
      <div>
        <div>count: {count}</div>
        <button onclick={() => setCount(count + 1)}>+1</button>
      </div>
      {loading && <Spinner />}
      {error && <div>{error.message}</div>}
      {data && <Product product={data} />}
      <div>
        {id > 1 && <Link to={`/query?id=${Number(id) - 1}`}>Back</Link>}
        <Link to={`/query?id=${Number(id) + 1}`}>Next</Link>
      </div>
    </>
  )
}

const Product = memo(function Product({ product }: { product: Product }) {
  return (
    <>
      <div>
        <h3>{product.title}</h3>
        <img src={product.thumbnail} />
      </div>
    </>
  )
})
