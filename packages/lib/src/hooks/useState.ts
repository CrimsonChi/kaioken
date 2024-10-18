import { __DEV__ } from "../env.js"
import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook, useHookHMRInvalidation } from "./utils.js"

export function useState<T>(
  initial: T | (() => T)
): readonly [T, (value: Kaioken.StateSetter<T>) => void] {
  if (!sideEffectsEnabled()) {
    return [
      typeof initial === "function" ? (initial as Function)() : initial,
      noop,
    ]
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
        if (__DEV__) {
          hook.debug = {
            get: () => ({ value: hook.state }),
            set: ({ value }) => (hook.state = value),
          } satisfies Kaioken.HookDebug<{ value: T }>
        }
        hook.state =
          typeof initial === "function" ? (initial as Function)() : initial
        hook.dispatch = (setter: Kaioken.StateSetter<T>) => {
          const newState =
            typeof setter === "function"
              ? (setter as Function)(hook.state)
              : setter
          if (Object.is(hook.state, newState)) return
          hook.state = newState
          update()
        }
      }

      return [hook.state, hook.dispatch] as const
    }
  )
}
