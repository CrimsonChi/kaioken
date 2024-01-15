import { Link, memo, useFetch, useState, type RouteChildProps } from "kaioken"
import { Spinner } from "./Spinner"
import { Button } from "./Button"

interface Product {
  title: string
  thumbnail: string
}

export function ProductPage(props: RouteChildProps) {
  const { id } = props.query
  const [count, setCount] = useState(0)

  const { loading, error, data } = useFetch<Product>(
    `https://dummyjson.com/products/${id}`
  )

  return (
    <>
      <div>
        <div>count: {count}</div>
        <Button onclick={() => setCount(count + 1)}>+1</Button>
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
