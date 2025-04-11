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

type PromiseCacheEntry<T> = {
  promise: Promise<T>
  fn: () => Promise<T>
}

const productId = signal(1)
let cache = new Map<string, PromiseCacheEntry<any>>()

function usePromiseCache<T>(
  key: string,
  fn: () => Promise<T>
): PromiseCacheEntry<T> {
  if (!cache.has(key)) {
    cache.set(key, { promise: fn(), fn })
  }
  return cache.get(key)!
}

export default function SuspenseExample() {
  return (
    <div>
      <button onclick={() => productId.value++}>Next Product</button>
      <Suspense
        fallback={
          <>
            <Spinner />
          </>
        }
      >
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

function SomeAsyncComponent() {
  const { promise: productPromise } = usePromiseCache<Product>(
    `product:${productId}`,
    () =>
      new Promise<Product>((res) => setTimeout(res, 1000)).then(() =>
        fetch(`https://dummyjson.com/products/${productId}`).then((res) =>
          res.json()
        )
      )
  )
  const product = useSuspense(productPromise)
  // @ts-ignore
  window.test = true

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
