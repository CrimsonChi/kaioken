import { useState } from "reflex-ui"

export const CountDisplay = () => {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>{count}</p>
      <button onclick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  )
}
