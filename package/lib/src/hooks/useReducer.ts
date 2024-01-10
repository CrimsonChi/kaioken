import { useHook } from "./utils.js"

export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  initial: T
): [T, (action: A) => void] {
  return useHook(
    "useReducer",
    { state: initial },
    ({ hook, node, requestUpdate }) => {
      const dispatch = (action: A) => {
        hook.state = reducer(hook.state, action)
        requestUpdate(node)
      }
      return [hook.state, dispatch]
    }
  )
}
