import { lazy, signal } from "kaioken"

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

function MiniCounter() {
  const count = signal(0)
  return <button onclick={() => count.value++}>Increment {count}</button>
}

const LazyCounter = lazy(() => {
  console.log("loading Counter")
  return sleep(1000).then(() =>
    import("./Counter").then(({ Counter }) => Counter)
  )
})

export function LazyDemo() {
  return (
    <div className="flex flex-col">
      <h1>Lazy Demo</h1>
      <LazyCounter fallback={<MiniCounter />}>sdsd</LazyCounter>
      <LazyCounter fallback={"TEST"}>sdsd</LazyCounter>
    </div>
  )
}
