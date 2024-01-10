import { depsRequireChange, useHook } from "./utils.js"

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useHook("useCallback", { callback, deps }, ({ hook, oldHook }) => {
    if (depsRequireChange(deps, oldHook?.deps)) {
      hook.callback = callback
    }
    return hook.callback
  })
}
