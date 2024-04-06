import { depsRequireChange, shouldExecHook, useHook } from "./utils.js"

export function useAsync<T>(func: () => Promise<T>, deps: unknown[]): T | null {
  if (!shouldExecHook()) return null
  return useHook(
    "useAsync",
    {
      deps,
      data: null as T | null,
      promise: undefined as Promise<T> | undefined,
    },
    ({ hook, oldHook, update }) => {
      if (depsRequireChange(deps, oldHook?.deps)) {
        hook.deps = deps
        hook.promise = func()
        hook.data = null
        hook.promise.then((data: T) => {
          if (!depsRequireChange(deps, hook.deps)) {
            hook.data = data
            update()
          }
        })
      }
      return hook.data
    }
  )
}
