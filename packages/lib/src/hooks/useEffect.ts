import {
  cleanupHook,
  depsRequireChange,
  shouldExecHook,
  useHook,
} from "./utils.js"

export function useEffect(
  callback: () => void | (() => void),
  deps?: unknown[]
): void {
  if (!shouldExecHook()) return
  return useHook(
    "useEffect",
    { callback, deps },
    ({ hook, oldHook, queueEffect }) => {
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
    }
  )
}
