import { useState, useMemo } from "kaioken"
import { Button } from "./Button"

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
      <Button onclick={() => setCount(count + 1)}>+1</Button>
      <Button onclick={() => setCount2(count2 + 1)}>+1</Button>
    </div>
  )
}
