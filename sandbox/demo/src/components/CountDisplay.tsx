import { useEffect, useState } from "reflex-ui"

export const CountDisplay = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log("count changed: ", count)
  }, [count])
  return (
    <div>
      <p>{count}</p>
      <button onclick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  )
}
