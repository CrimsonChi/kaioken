import { shouldExecHook, useHook } from "./utils.js"

export function useOptimistic<T, U extends readonly unknown[]>(
  state: T,
  setState: (state: T, ...args: U) => T
): [T, (...args: U) => () => void] {
  if (!shouldExecHook()) [state, () => () => {}]

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

      const setter = (...args: U) => {
        const fn = (state: T) => setState(state, ...args)
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
