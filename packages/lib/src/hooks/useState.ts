import { noop } from "../utils.js"
import { shouldExecHook, useHook } from "./utils.js"

export function useState<T>(
  initial: T | (() => T)
): [T, (value: Kaioken.StateSetter<T>) => void] {
  if (!shouldExecHook()) {
    return [initial instanceof Function ? initial() : initial, noop]
  }

  return useHook(
    "useState",
    {
      state: undefined as T,
      dispatch: noop as (value: Kaioken.StateSetter<T>) => void,
    },
    ({ hook, oldHook, update }) => {
      if (!oldHook) {
        hook.state = initial instanceof Function ? initial() : initial
        hook.dispatch = (setter: Kaioken.StateSetter<T>) => {
          const newState =
            setter instanceof Function ? setter(hook.state) : setter
          if (newState !== hook.state) {
            hook.state = newState
            update()
          }
        }
      }

      return [hook.state, hook.dispatch]
    }
  )
}
