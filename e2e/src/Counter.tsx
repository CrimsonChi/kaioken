import { useState } from "kaioken"

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div id="counter">
      {count % 2 === 0 ? (
        <span data-even={true}>{count}</span>
      ) : (
        <span data-odd={true}>{count}</span>
      )}
      <button onclick={() => setCount((prev) => prev + 1)}>increment</button>
      {count > 0 && count % 2 === 0 && <p>count is even</p>}
    </div>
  )
}
