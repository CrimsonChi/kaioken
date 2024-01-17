import { useHook } from "./utils.js"

export function useOptimistic<T, U>(
  state: T,
  setState: (prev: T, newValue: U) => T
): [T, (value: U) => void] {
  return useHook(
    "useOptimistic",
    { prev: state, state, queue: [] as Function[] },
    ({ hook, oldHook, update }) => {
      if (!oldHook) hook.prev = state
      if (state !== hook.prev) {
        //new initial state, shift queue and re-mutate
        hook.prev = state
        hook.queue.shift()
        hook.state = hook.queue.reduce((acc, fn) => fn(acc), hook.prev)
      }

      const setter = (newValue: U) => {
        hook.state = setState(hook.state, newValue)
        hook.queue.push((state: T) => setState(state, newValue))
        update()
      }

      return [hook.state, setter]
    }
  )
}
