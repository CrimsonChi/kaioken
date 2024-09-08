import {
  cleanupHook,
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
} from "./utils.js"

export function useLayoutEffect(
  callback: () => void | (() => void),
  deps?: unknown[]
): void {
  if (!sideEffectsEnabled()) return
  return useHook(
    "useLayoutEffect",
    { deps },
    ({ hook, isInit, queueEffect }) => {
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
