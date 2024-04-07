import { useState } from "kaioken"
import { getCurrentNode, getNodeAppContext } from "kaioken/utils"

export function Counter() {
  const [count, setCount] = useState(0)

  const node = getCurrentNode()
  const ctx = getNodeAppContext(node!)
  console.log(ctx, node)

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
