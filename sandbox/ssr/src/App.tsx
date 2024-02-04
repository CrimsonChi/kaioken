import { useState } from "kaioken"
import { isSSR } from "./constants"
import { PageProps, Product } from "./types"
import { PageContext } from "./pageContext"

export function App({ request, data }: PageProps) {
  if (isSSR) {
    console.log("SSR!")
  }
  return (
    <PageContext.Provider value={data}>
      <h1>Hello world!</h1>
      <p>path: {request.path}</p>
      <div>
        <p>Login creds</p>
        <span>Username: atuny0</span>
        <span>Password: 9uQFF1Lh</span>
      </div>
      <Counter />
      {data?.product && <ProductView product={data.product} />}
    </PageContext.Provider>
  )
}

function Counter() {
  const [count, setCount] = useState(5)

  return (
    <div>
      <span>{count}</span>
      <button onclick={() => setCount((prev) => prev + 1)}>Increment</button>
    </div>
  )
}

function ProductView({ product }: { product: Product }) {
  return (
    <div>
      <h1>{product.title}</h1>
      <img src={product.thumbnail} />
    </div>
  )
}
