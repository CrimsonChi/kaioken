import { Suspense, useSuspense, signal, ErrorBoundary } from "kaioken"
import { Spinner } from "./atoms/Spinner"
import { usePromise } from "../promiseCache"

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
      <Suspense fallback={<div>Loading...</div>}>
        <SomeAsyncComponent />
        {/* <ErrorBoundary
          logger={console.error}
          fallback={<p>⚠️ Something went wrong 😭</p>}
        >
          <SomeComponentThatThrows />
        </ErrorBoundary> */}
      </Suspense>
    </div>
  )
}

function SomeComponentThatThrows() {
  throw new Error("oops!")
  return <div>Something you'll never see because I throw</div>
}

function SomeAsyncComponent() {
  const [product, reloadProduct] = useSuspense<Product>(() =>
    fetch(`https://dummyjson.com/products/${productId}`).then((res) =>
      res.json()
    )
  )
  // @ts-ignore
  // window.test = true

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
