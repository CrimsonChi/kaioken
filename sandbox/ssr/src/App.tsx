import { useState } from "kaioken"

interface AppProps {
  path: string
}

export function App({ path }: AppProps) {
  return (
    <>
      <h1>Hello world! {path}</h1>
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
