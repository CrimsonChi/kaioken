import { useEffect, useRef, useState, useSyncExternalStore } from "kaioken"
import { Button } from "./Button"
import { createSignal } from "../signal"

const externalStore = createSignal(0)

setInterval(() => {
  externalStore.value++
}, 1000)

export function Counter() {
  const ref = useRef<HTMLButtonElement>(null)
  const [count, setCount] = useState(0)
  const _count = useSyncExternalStore(
    externalStore.subscribe,
    () => externalStore.value
  )

  useEffect(() => {
    console.log("count", count, ref.current)
    return () => {
      console.log("cleanup", count, ref.current)
    }
  }, [count])

  return (
    <div>
      <div>
        External: {_count}
        Counter: {count}
        <Button ref={ref} onclick={() => setCount((prev) => prev + 1)}>
          +
        </Button>
      </div>
    </div>
  )
}
