import { useState } from "kaioken"
import type { SSRProps } from "kaioken/ssr"

export function App({ request }: SSRProps) {
  return (
    <>
      <h1>Hello world!</h1>
      <p>path: {request.path}</p>
      <Counter />
    </>
  )
}

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <span>{count}</span>
      <button onclick={() => setCount((prev) => prev + 1)}>Increment</button>
    </div>
  )
}
