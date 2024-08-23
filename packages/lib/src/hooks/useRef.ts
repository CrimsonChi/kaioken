import { __DEV__ } from "../env.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

export function useRef<T>(current: T): Kaioken.Ref<T> {
  if (!sideEffectsEnabled()) return { current }
  return useHook("useRef", { current }, ({ hook }) => {
    if (__DEV__) {
      hook.debug = {
        get: () => ({ value: hook.current }),
        set: ({ value }) => (hook.current = value),
      } satisfies Kaioken.HookDebug<{ value: T }>
    }
    return hook
  })
}
