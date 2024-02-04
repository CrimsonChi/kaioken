import { depsRequireChange, useHook, isSSR } from "./utils.js"

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: unknown[]
): T {
  if (isSSR) return callback

  return useHook("useCallback", { callback, deps }, ({ hook, oldHook }) => {
    if (depsRequireChange(deps, oldHook?.deps)) {
      hook.callback = callback
    }
    return hook.callback
  })
}
