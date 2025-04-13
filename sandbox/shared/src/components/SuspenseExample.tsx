import { Suspense, useSuspense, signal, ErrorBoundary } from "kaioken"

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

export function SuspenseExample() {
  return (
    <div>
      <button onclick={() => productId.value++}>Next Product</button>
      <Suspense fallback={<div>Loading...</div>}>
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

async function loadProduct() {
  await new Promise<Product>((res) => setTimeout(res, 1000))
  const res = await fetch(`https://dummyjson.com/products/${productId}`)
  return await res.json()
}

async function loadRandomNumber(product: Product) {
  await new Promise((res) => setTimeout(res, 1000))
  return product.price
}

function SomeAsyncComponent() {
  console.log("SomeAsyncComponent -> product")
  const product = useSuspense<Product>(loadProduct, [productId.value])
  console.log("SomeAsyncComponent -> randomNumber")
  const randomNumber = useSuspense(() => loadRandomNumber(product), [product])
  console.log("randomNumber", randomNumber)
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
