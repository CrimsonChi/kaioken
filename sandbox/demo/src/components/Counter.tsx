import { useEffect, useState, useSyncExternalStore } from "kaioken"
import { Button } from "./Button"
import { createSignal } from "../signal"
import { MyClassComponent } from "./ClassComponent"

const externalStore = createSignal(0)

setInterval(() => {
  externalStore.value++
}, 1000)

export function Counter() {
  const [count, setCount] = useState(0)
  const _count = useSyncExternalStore(
    (fn: (value: number) => void) => {
      console.log("useSyncExternalStore - subscribe")
      const unsub = externalStore.subscribe(fn)
      return () => {
        console.log("useSyncExternalStore - unsubscribe")
        unsub()
      }
    },
    () => externalStore.value
  )

  useEffect(() => {
    console.log("count", count)
    return () => {
      console.log("cleanup", count)
    }
  }, [count])

  return (
    <div>
      <div>
        External: {_count}
        <br />
        Counter: {count}
        <Button onclick={() => setCount((prev) => prev + 1)}>+</Button>
        <MyClassComponent data={count} />
      </div>
    </div>
  )
}
