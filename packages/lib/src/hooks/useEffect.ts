import { safeStringify } from "../utils.js"
import { __DEV__ } from "../env.js"
import {
  cleanupHook,
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
} from "./utils.js"

type UseEffectDevState = {
  deps?: unknown[]
  serialized: {
    callback: string
    deps: string
  }
}

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
  return useHook(
    "useEffect",
    { deps } as UseEffectDevState,
    ({ hook, isInit, isHMR, queueEffect }) => {
      if (__DEV__) {
        if (isInit) {
          hook.serialized = {
            callback: safeStringify(callback),
            deps: safeStringify(deps),
          }
        }
        if (isHMR) {
          const newCallback = safeStringify(callback)
          const newDeps = safeStringify(deps)
          if (
            hook.serialized.callback !== newCallback ||
            hook.serialized.deps !== newDeps
          ) {
            isInit = true
            hook.serialized = { callback: newCallback, deps: newDeps }
          }
        }
      }
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
    }
  )
}
