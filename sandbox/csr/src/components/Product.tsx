import { memo, useAsync, type RouteChildProps } from "kaioken"
import { Spinner } from "./atoms/Spinner"
import { Link } from "./atoms/Link"
import { H3 } from "./atoms/Heading"
import { Container } from "./atoms/Container"

interface Product {
  title: string
  thumbnail: string
}

export function ProductPage({ query: { id } }: RouteChildProps) {
  const [data, loading, error] = useAsync<Product>(
    () =>
      fetch(`https://dummyjson.com/products/${id}`).then((res) => res.json()),
    [id]
  )

  return (
    <>
      {loading && <Spinner />}
      {error && <div>{error}</div>}
      {data && <Product product={data} />}
      <div className="flex items-center justify-center">
        {id > 1 && <Link to={`/query?id=${Number(id) - 1}`}>Back</Link>}
        <Link to={`/query?id=${Number(id) + 1}`}>Next</Link>
      </div>
    </>
  )
}

const Product = memo(function Product({ product }: { product: Product }) {
  return (
    <Container>
      <H3 className="text-center">{product.title}</H3>
      <img src={product.thumbnail} />
    </Container>
  )
})
