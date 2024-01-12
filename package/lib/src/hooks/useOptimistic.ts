import { useHook } from "./utils.js"

export function useOptimistic<T, U>(
  state: T,
  setState: (prev: T, newValue: U) => T
): [T, (value: U) => void] {
  return useHook(
    "useOptimistic",
    { state, isTrigger: false, queue: [] as Function[] },
    ({ hook, update }) => {
      if (hook.isTrigger) {
        hook.isTrigger = false
      } else {
        hook.state = state
        hook.queue.shift()?.(hook.state)
        for (const f of hook.queue) {
          hook.state = f(hook.state)
        }
      }

      const setter = (newValue: U) => {
        hook.state = setState(hook.state, newValue)
        hook.queue.push((state: T) => setState(state, newValue))
        hook.isTrigger = true
        update()
      }

      return [hook.state, setter]
    }
  )
}
