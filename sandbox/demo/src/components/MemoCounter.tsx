import { useState, useMemo } from "kaioken"

export function MemoCounter() {
  const [count, setCount] = useState(0)
  const [count2, setCount2] = useState(0)

  const memoizedValue = useMemo(() => {
    console.log("useMemo")
    return count + 1
  }, [count])

  return (
    <div>
      <div>count: {count}</div>
      <div>count2: {count2}</div>
      <div>memoizedValue: {memoizedValue}</div>
      <button onclick={() => setCount(count + 1)}>+1</button>
      <button onclick={() => setCount2(count2 + 1)}>+1</button>
    </div>
  )
}
