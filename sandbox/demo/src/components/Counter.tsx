import { useEffect, useRef, useState } from "reflex-ui"
import { Button } from "./Button"

export function Counter() {
  const ref = useRef<HTMLButtonElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log("count", count, ref.current)
    return () => {
      console.log("cleanup", count, ref.current)
    }
  }, [count])

  return (
    <div>
      <div>
        Counter <>{count}</>
        <Button ref={ref} onclick={() => setCount((prev) => prev + 1)}>
          +
        </Button>
      </div>
    </div>
  )
}
