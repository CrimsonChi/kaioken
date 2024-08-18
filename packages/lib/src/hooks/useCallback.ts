import { depsRequireChange, useHook, sideEffectsEnabled } from "./utils.js"

export function useCallback<T extends Function>(
  callback: T,
  deps: unknown[]
): T {
  if (!sideEffectsEnabled()) return callback

  return useHook("useCallback", { callback, deps }, ({ hook, isInit }) => {
    if (isInit || depsRequireChange(deps, hook.deps)) {
      hook.deps = deps
      hook.callback = callback
    }
    return hook.callback
  })
}
