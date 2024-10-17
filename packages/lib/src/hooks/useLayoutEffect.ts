import { __DEV__ } from "../env.js"
import {
  cleanupHook,
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
  useHookHMRInvalidation,
} from "./utils.js"

export function useLayoutEffect(
  callback: () => void | (() => void),
  deps?: unknown[]
): void {
  if (!sideEffectsEnabled()) return
  if (__DEV__) {
    useHookHMRInvalidation(...arguments)
  }
  return useHook(
    "useLayoutEffect",
    { deps },
    ({ hook, isInit, queueEffect }) => {
      if (__DEV__) {
        hook.debug = { get: () => ({ callback, dependencies: hook.deps }) }
      }
      if (isInit || depsRequireChange(deps, hook.deps)) {
        hook.deps = deps
        cleanupHook(hook)
        queueEffect(
          () => {
            const cleanup = callback()
            if (typeof cleanup === "function") {
              hook.cleanup = cleanup
            }
          },
          { immediate: true }
        )
      }
    }
  )
}
