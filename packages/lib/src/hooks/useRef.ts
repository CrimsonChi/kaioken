import { __DEV__ } from "../env.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

export function useRef<T>(initialValue: T): Kaioken.MutableRefObject<T>
export function useRef<T>(initialValue: T | null): Kaioken.RefObject<T>
export function useRef<T = undefined>(): Kaioken.MutableRefObject<T | undefined>
export function useRef<T>(initialValue?: T | null) {
  if (!sideEffectsEnabled()) return { current: initialValue }
  return useHook("useRef", { current: initialValue }, ({ hook }) => {
    if (__DEV__) {
      hook.debug = {
        get: () => ({ value: hook.current }),
        set: ({ value }) => (hook.current = value),
      } as Kaioken.HookDebug<{ value: T }>
    }
    return hook
  })
}
