import { HookCallbackState, sideEffectsEnabled, useHook } from "./utils.js"

const useRefCallback = <T>({ hook }: HookCallbackState<{ current: T }>) => hook

export function useRef<T>(current: T): Kaioken.Ref<T> {
  if (!sideEffectsEnabled()) return { current }
  return useHook(
    "useRef",
    { current },
    useRefCallback as typeof useRefCallback<T>
  )
}
