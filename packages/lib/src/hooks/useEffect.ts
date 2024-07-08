import {
  cleanupHook,
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
} from "./utils.js"

export function useEffect(
  callback: () => void | (() => void),
  deps?: unknown[]
): void {
  if (!sideEffectsEnabled()) return
  return useHook("useEffect", { deps }, ({ hook, oldHook, queueEffect }) => {
    if (depsRequireChange(deps, oldHook?.deps)) {
      hook.deps = deps
      if (oldHook) {
        cleanupHook(oldHook)
      }
      queueEffect(() => {
        const cleanup = callback()
        if (cleanup && typeof cleanup === "function") {
          hook.cleanup = cleanup
        }
      })
    }
  })
}
