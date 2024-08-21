import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

export function useState<T>(
  initial: T | (() => T)
): [T, (value: Kaioken.StateSetter<T>) => void] {
  if (!sideEffectsEnabled()) {
    return [initial instanceof Function ? initial() : initial, noop]
  }

  return useHook(
    "useState",
    {
      state: undefined as T,
      dispatch: noop as (value: Kaioken.StateSetter<T>) => void,
    },
    ({ hook, isInit, update }) => {
      if (isInit) {
        hook.state = initial instanceof Function ? initial() : initial
        hook.dispatch = (setter: Kaioken.StateSetter<T>) => {
          const newState =
            setter instanceof Function ? setter(hook.state) : setter
          if (newState !== hook.state) {
            hook.state = newState
            update()
          }
        }
        hook.debug = () => ({ value: hook.state })
      }

      return [hook.state, hook.dispatch] as [
        T,
        (value: Kaioken.StateSetter<T>) => void,
      ]
    }
  )
}
