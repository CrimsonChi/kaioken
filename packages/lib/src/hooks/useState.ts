import { __DEV__ } from "../env.js"
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
          if (Object.is(hook.state, newState)) return
          hook.state = newState
          update()
        }
        if (__DEV__) {
          hook.debug = {
            get: () => ({ value: hook.state }),
            set: ({ value }) => (hook.state = value),
          } satisfies Kaioken.HookDebug<{ value: T }>
        }
      }

      return [hook.state, hook.dispatch] as [
        T,
        (value: Kaioken.StateSetter<T>) => void,
      ]
    }
  )
}
