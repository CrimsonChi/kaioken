import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  state: T
): [T, (action: A) => void] {
  if (!sideEffectsEnabled()) return [state, noop]

  return useHook(
    "useReducer",
    { state, dispatch: noop as (action: A) => void },
    ({ hook, isInit, update }) => {
      if (isInit) {
        hook.dispatch = (action: A) => {
          const newState = reducer(hook.state, action)
          if (newState !== hook.state) {
            hook.state = newState
            update()
          }
        }
        hook.debug = () => ({ value: hook.state })
      }
      return [hook.state, hook.dispatch] as [T, (action: A) => void]
    }
  )
}
