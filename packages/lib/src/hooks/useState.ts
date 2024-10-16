import { __DEV__ } from "../env.js"
import { noop, safeStringify } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

type UseEffectDevState = {
  state: any
  dispatch: (value: any) => void
  serialized: string
}

export function useState<T>(
  initial: T | (() => T)
): readonly [T, (value: Kaioken.StateSetter<T>) => void] {
  if (!sideEffectsEnabled()) {
    return [initial instanceof Function ? initial() : initial, noop]
  }

  return useHook(
    "useState",
    {
      state: undefined as T,
      dispatch: noop as (value: Kaioken.StateSetter<T>) => void,
    } as UseEffectDevState,
    ({ hook, isInit, isHMR, update }) => {
      if (__DEV__) {
        hook.debug = {
          get: () => ({ value: hook.state }),
          set: ({ value }) => (hook.state = value),
        } satisfies Kaioken.HookDebug<{ value: T }>

        if (isHMR) {
          const newInitial = safeStringify(initial)
          if (hook.serialized !== newInitial) {
            hook.serialized = newInitial
            hook.state = initial instanceof Function ? initial() : initial
          }
        }
      }

      if (isInit) {
        if (__DEV__) {
          hook.serialized = safeStringify(initial)
        }
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
