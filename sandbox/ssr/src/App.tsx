import { useState } from "kaioken"

export function App() {
  return (
    <>
      <h1>Hello world! 23</h1>
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
