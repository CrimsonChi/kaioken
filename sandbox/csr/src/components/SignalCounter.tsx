import { count } from "./signals/test"

export const SignalCounter = () => {
  const $count = count()
  const onInc = () => {
    $count.value += 1
  }

  return <button onclick={onInc}>{$count}</button>
}
