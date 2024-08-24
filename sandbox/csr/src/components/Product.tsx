import { memo, useAsync, useRouter } from "kaioken"
import { Spinner } from "./atoms/Spinner"
import { Link } from "./atoms/Link"
import { H3 } from "./atoms/Heading"
import { Container } from "./atoms/Container"

interface Product {
  title: string
  thumbnail: string
}

export function ProductPage() {
  const router = useRouter()
  const id = router.query.id
  const { data, loading, error, invalidate } = useAsync<Product>(
    () =>
      fetch(`https://dummyjson.com/products/${id}`).then((res) => res.json()),
    [id]
  )

  console.log("product", data)

  return (
    <>
      {/* {data ? (
        <Product product={data} />
      ) : loading ? (
        <Spinner />
      ) : (
        <div>{error.message}</div>
      )} */}
      {loading && <Spinner />}
      {error && <div>{error.message}</div>}
      {data && <Product product={data} />}
      <div className="flex items-center justify-center">
        {parseInt(id) > 1 && (
          <Link to={`/query?id=${Number(id) - 1}`}>Back</Link>
        )}
        <Link to={`/query?id=${Number(id) + 1}`}>Next</Link>
        <button onclick={() => invalidate(true)}>Invalidate</button>
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
