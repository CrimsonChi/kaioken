import { Suspense, useSuspense, signal, ErrorBoundary } from "kaioken"
import { Spinner } from "./atoms/Spinner"

type Product = {
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

const productId = signal(1)

export default function SuspenseExample() {
  return (
    <div>
      <button onclick={() => productId.value++}>Next Product</button>
      <Suspense fallback={<Spinner />}>
        <SomeAsyncComponent />
        <ErrorBoundary
          logger={console.error}
          fallback={<p>⚠️ Something went wrong 😭</p>}
        >
          <SomeComponentThatThrows />
        </ErrorBoundary>
      </Suspense>
    </div>
  )
}

function SomeComponentThatThrows() {
  throw new Error("oops!")
  return <div>Something you'll never see because I throw</div>
}

function loadProduct() {
  return new Promise<Product>((res) => setTimeout(res, 1000)).then(() =>
    fetch(`https://dummyjson.com/products/${productId}`).then((res) =>
      res.json()
    )
  )
}

function SomeAsyncComponent() {
  const product = useSuspense<Product>(loadProduct, [productId.value])
  return (
    <article>
      <h1>
        {product.title} <sup>({product.id})</sup>
      </h1>
      <p>{product.description}</p>

      <img src={product.thumbnail} />
    </article>
  )
}
