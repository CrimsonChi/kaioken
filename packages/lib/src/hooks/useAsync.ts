import { depsRequireChange, shouldExecHook, useHook } from "./utils.js"

type UseAsyncResult<T> =
  | [T, false, null] // loaded
  | [null, true, null] // loading
  | [null, false, any] // error

export function useAsync<T>(
  func: () => Promise<T>,
  deps: unknown[]
): UseAsyncResult<T> {
  if (!shouldExecHook()) return [null, true, null] as const
  return useHook(
    "useAsync",
    {
      deps,
      data: null as T | null,
      error: null as any | null,
      loading: true as boolean,
    },
    ({ hook, oldHook, update }) => {
      if (depsRequireChange(deps, oldHook?.deps)) {
        hook.data = null
        hook.loading = true
        hook.error = null
        hook.deps = deps
        func()
          .then((data: T) => {
            if (!depsRequireChange(deps, hook.deps)) {
              hook.data = data
              hook.loading = false
              hook.error = null
              update()
            }
          })
          .catch((error) => {
            if (!depsRequireChange(deps, hook.deps)) {
              hook.data = null
              hook.loading = false
              hook.error = error
              update()
            }
          })
      }
      return [hook.data, hook.loading, hook.error] as UseAsyncResult<T>
    }
  )
}
