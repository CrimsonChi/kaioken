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
  invalidate: () => void
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
      load: noop as (
        deps: unknown[],
        func: () => Promise<T>,
        isInit: boolean
      ) => void,
    },
    ({ hook, isInit, update }) => {
      if (isInit) {
        hook.load = (deps, func, isInit) => {
          hook.data = null
          hook.loading = true
          hook.error = null
          hook.deps = deps
          if (!isInit) update()
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
                hook.error = new UseAsyncError(error)
                update()
              }
            })
        }
      }

      if (isInit || depsRequireChange(deps, hook.deps)) {
        hook.load(deps, func, isInit)
      }

      return {
        data: hook.data,
        loading: hook.loading,
        error: hook.error,
        invalidate: () => {
          hook.load([], func, false)
        },
      } as UseAsyncResult<T>
    }
  )
}
