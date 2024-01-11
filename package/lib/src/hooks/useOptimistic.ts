import { useHook } from "./utils.js"

export function useOptimistic<T, U>(
  initial: T,
  setter: (prev: T, newValue: U) => T
): [T, (value: U) => void] {
  return useHook(
    "useOptimistic",
    { state: initial, isRenderTrigger: false, queue: [] as Function[] },
    ({ hook, node, requestUpdate }) => {
      if (hook.isRenderTrigger) {
        hook.isRenderTrigger = false
      } else {
        hook.state = initial
        hook.queue.shift()?.(hook.state)
        for (const f of hook.queue) {
          hook.state = f(hook.state)
        }
      }

      return [
        hook.state,
        (newValue: U) => {
          hook.state = setter(hook.state, newValue)
          hook.queue.push((state: T) => setter(state, newValue))
          hook.isRenderTrigger = true
          requestUpdate(node)
        },
      ]
    }
  )
}
