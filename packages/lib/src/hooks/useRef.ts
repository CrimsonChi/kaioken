import { __DEV__ } from "../env.js"
import { HookCallbackState, sideEffectsEnabled, useHook } from "./utils.js"

type UseCallbackState<T> = {
  current: T
}

export function useRef<T>(initialValue: T): Kaioken.MutableRefObject<T>
export function useRef<T>(initialValue: T | null): Kaioken.RefObject<T>
export function useRef<T = undefined>(): Kaioken.MutableRefObject<T | undefined>
export function useRef<T>(initialValue?: T | null) {
  if (!sideEffectsEnabled()) return { current: initialValue }
  return useHook("useRef", { current: initialValue }, useRefCallback)
}

const useRefCallback = <T>({
  hook,
  isInit,
}: HookCallbackState<UseCallbackState<T>>) => {
  if (isInit) {
    if (__DEV__) {
      hook.debug = {
        get: () => ({ value: hook.current }),
        set: ({ value }) => (hook.current = value),
      } satisfies Kaioken.HookDebug<{ value: T }>
    }
  }
  return hook
}
