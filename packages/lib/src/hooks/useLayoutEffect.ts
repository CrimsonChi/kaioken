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
    ({ hook, oldHook, queueEffect }) => {
      if (depsRequireChange(deps, oldHook?.deps)) {
        hook.deps = deps
        if (oldHook) {
          cleanupHook(oldHook)
        }
        queueEffect(
          () => {
            const cleanup = callback()
            if (cleanup && typeof cleanup === "function") {
              hook.cleanup = cleanup
            }
          },
          { immediate: true }
        )
      }
    }
  )
}
