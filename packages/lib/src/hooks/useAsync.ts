import { noop } from "../utils.js"
import { depsRequireChange, shouldExecHook, useHook } from "./utils.js"

type UseAsyncResult<T> = (
  | /** loading*/ {
      data: null
      loading: true
      error: null
    }
  | /** loaded */ {
      data: T
      loading: false
      error: null
    }
  | /** error */ {
      data: null
      loading: false
      error: UseAsyncError
    }
) & {
  invalidate: (forceUpdate?: boolean) => void
}

export class UseAsyncError extends Error {
  rawValue: any
  constructor(message: unknown) {
    super(message instanceof Error ? message.message : String(message))
    this.name = "UseAsyncError"
    this.rawValue = message
  }
}

export function useAsync<T>(
  func: () => Promise<T>,
  deps: unknown[]
): UseAsyncResult<T> {
  if (!shouldExecHook())
    return {
      data: null,
      loading: true,
      error: null,
      invalidate: noop,
    }
  return useHook(
    "useAsync",
    {
      deps,
      data: null as T | null,
      error: null as Error | null,
      loading: true as boolean,
      invalidate: noop,
    },
    ({ hook, oldHook, update }) => {
      const load = (force: boolean = false) => {
        hook.data = null
        hook.loading = true
        hook.error = null
        hook.deps = deps
        func()
          .then((data: T) => {
            if (!depsRequireChange(deps, hook.deps) || force) {
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
              hook.error = new UseAsyncError(error)
              update()
            }
          })
      }
      if (depsRequireChange(deps, oldHook?.deps)) {
        load()
      }
      if (!oldHook) {
        hook.invalidate = (forceUpdate?: boolean) => {
          load()
          forceUpdate && update()
        }
      }
      return {
        data: hook.data,
        loading: hook.loading,
        error: hook.error,
        invalidate: hook.invalidate,
      } as UseAsyncResult<T>
    }
  )
}
