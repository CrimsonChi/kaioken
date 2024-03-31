import { depsRequireChange, useHook, shouldExecHook } from "./utils.js"

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: unknown[]
): T {
  if (!shouldExecHook()) return callback

  return useHook("useCallback", { callback, deps }, ({ hook, oldHook }) => {
    if (depsRequireChange(deps, oldHook?.deps)) {
      hook.deps = deps
      hook.callback = callback
    }
    return hook.callback
  })
}
