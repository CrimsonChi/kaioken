import { useState, memo } from "kaioken"
import { Button } from "./components/atoms/Button"

export function MemoDemo() {
  const [count, setCount] = useState(0)
  return (
    <div id="memo">
      <span>Count: {count}</span>
      <Button onclick={() => setCount((prev) => prev + 1)}>Increment</Button>
      <WhenPropsChangeMemo count={count} />
      {count % 2 === 0 && <DynamicRenderMemo />}
    </div>
  )
}

let renders = 0
const WhenPropsChangeMemo = memo(CountDisplay)

function CountDisplay({ count }: { count: number }) {
  console.log("this should only log when mounted")
  return (
    <div id="memo-props" className="flex flex-col">
      <div>Memo Demo {count}</div>
      <span>Render Count: {++renders}</span>
    </div>
  )
}

let renders2 = 0
const DynamicRenderMemo = memo(() => {
  return (
    <div id="memo-dynamic" className="flex flex-col">
      <span className="text-red-500">Render Count: {++renders2}</span>
    </div>
  )
})
