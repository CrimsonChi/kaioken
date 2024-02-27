import { shouldExecHook, useHook } from "./utils.js"

export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  state: T
): [T, (action: A) => void] {
  if (!shouldExecHook()) return [state, () => {}]

  return useHook("useReducer", { state }, ({ hook, update }) => {
    const setter = (action: A) => {
      const newState = reducer(hook.state, action)
      if (newState !== hook.state) {
        hook.state = newState
        update()
      }
    }
    return [hook.state, setter]
  })
}
