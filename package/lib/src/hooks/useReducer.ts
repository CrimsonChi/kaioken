import { useHook } from "./utils.js"

export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  state: T
): [T, (action: A) => void] {
  return useHook("useReducer", { state }, ({ hook, update }) => {
    const setter = (action: A) => {
      hook.state = reducer(hook.state, action)
      update()
    }
    return [hook.state, setter]
  })
}
