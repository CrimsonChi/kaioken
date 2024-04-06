import { useState } from "kaioken"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <>
      <span>count: {count}</span>
      <br />
      <button
        className="px-2 py-1 bg-indigo-700"
        onclick={() => setCount((prev) => prev + 1)}
      >
        Increment
      </button>
    </>
  )
}
