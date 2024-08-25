import { useState } from "kaioken"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <>
      <span>Count: {count}</span>{" "}
      <button
        onclick={() => setCount((prev) => prev + 1)}
        className="bg-primary hover:bg-primary-light text-white font-bold text-sm py-2 px-4 rounded"
      >
        Increment
      </button>
    </>
  )
}
