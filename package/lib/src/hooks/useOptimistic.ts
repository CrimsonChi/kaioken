import { isSSR, useHook } from "./utils.js"

export function useOptimistic<T, U>(
  state: T,
  setState: (prev: T, newValue: U) => T
): [T, (value: U) => () => void] {
  if (isSSR) [state, () => () => {}]

  return useHook(
    "useOptimistic",
    {
      state,
      optimistic: state,
      queue: [] as Function[],
    },
    ({ hook, update }) => {
      if (state !== hook.state) {
        //new initial state, shift queue and re-mutate
        hook.state = state
        hook.queue.shift()
        hook.optimistic = hook.queue.reduce((acc, fn) => fn(acc), hook.state)
      }

      const setter = (newValue: U) => {
        const fn = (state: T) => setState(state, newValue)
        const newState = fn(hook.optimistic)
        hook.optimistic = newState
        hook.queue.push(fn)
        update()

        return () => {
          hook.queue.splice(hook.queue.indexOf(fn), 1)
          hook.optimistic = hook.queue.reduce((acc, fn) => fn(acc), hook.state)
          update()
        }
      }

      return [hook.optimistic, setter]
    }
  )
}
