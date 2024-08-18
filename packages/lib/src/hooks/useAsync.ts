import { noop } from "../utils.js"
import { depsRequireChange, sideEffectsEnabled, useHook } from "./utils.js"

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
  constructor(message: unknown) {
    super(message instanceof Error ? message.message : String(message))
    this.name = "UseAsyncError"
    this.cause = message
  }
}

export function useAsync<T>(
  func: () => Promise<T>,
  deps: unknown[]
): UseAsyncResult<T> {
  if (!sideEffectsEnabled())
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
    ({ hook, isInit, update }) => {
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
      if (isInit || depsRequireChange(deps, hook.deps)) {
        load()
      }
      if (isInit) {
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
