import { useState } from "kaioken"

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <>
      <span>count: {count}</span>
      <button
        className="px-2 py-1 bg-red-500"
        onclick={() => setCount((prev) => prev + 1)}
      >
        Increment
      </button>
    </>
  )
}
