import { __DEV__ } from "../env.js"
import {
  cleanupHook,
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
  useHookHMRInvalidation,
} from "./utils.js"

/**
 * Runs a function after the component is rendered, or when a value provided in the optional [dependency
 * array](https://kaioken.dev/docs/hooks/dependency-arrays) has changed.
 *
 * [Kaioken Reference](https://kaioken.dev/docs/hooks/useEffect)
 * */
export function useEffect(
  callback: () => void | (() => void),
  deps?: unknown[]
): void {
  if (!sideEffectsEnabled()) return
  if (__DEV__) {
    useHookHMRInvalidation(...arguments)
  }
  return useHook("useEffect", { deps }, ({ hook, isInit, queueEffect }) => {
    if (isInit || depsRequireChange(deps, hook.deps)) {
      hook.deps = deps
      cleanupHook(hook)
      queueEffect(() => {
        const cleanup = callback()
        if (typeof cleanup === "function") {
          hook.cleanup = cleanup
        }
      })
    }
  })
}
