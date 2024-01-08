import { useEffect, useState } from "reflex-ui"
import { Button } from "./Button"

export function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log("count", count)
    return () => {
      console.log("cleanup", count)
    }
  }, [count])

  return (
    <div>
      <div>
        Counter <>{count}</>
        <Button onclick={() => setCount((prev) => prev + 1)}>+</Button>
      </div>
    </div>
  )
}
