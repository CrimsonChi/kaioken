import { memo } from "kaioken"
import { Button } from "./components/atoms/Button"
import { count } from "./components/signals/test"

export function MemoDemo() {
  return (
    <div id="memo">
      <span>Count: {count}</span>
      <Button onclick={() => count.value++}>Increment</Button>
      <WhenPropsChangeMemo count={1} />
      {count.value % 2 === 0 && <DynamicRenderMemo />}
    </div>
  )
}

let renders = 0
const WhenPropsChangeMemo = memo(({ count }: { count: number }) => {
  console.log("this should only log when mounted")
  return (
    <div id="memo-props" className="flex flex-col">
      <div>Memo Demo {count}</div>
      <span>Render Count: {++renders}</span>
    </div>
  )
})

let renders2 = 0
const DynamicRenderMemo = memo(() => {
  return (
    <div id="memo-dynamic" className="flex flex-col">
      <span className="text-red-500">Render Count: {++renders2}</span>
    </div>
  )
})
