import { __DEV__ } from "../env.js"
import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook, useHookHMRInvalidation } from "./utils.js"

export function useState<T>(
  initial: T | (() => T)
): readonly [T, (value: Kaioken.StateSetter<T>) => void] {
  if (!sideEffectsEnabled()) {
    return [initial instanceof Function ? initial() : initial, noop]
  }
  if (__DEV__) {
    useHookHMRInvalidation(...arguments)
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
          if (Object.is(hook.state, newState)) return
          hook.state = newState
          update()
        }
      }

      return [hook.state, hook.dispatch] as const
    }
  )
}
