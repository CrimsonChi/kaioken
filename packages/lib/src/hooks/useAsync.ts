import { __DEV__ } from "../env.js"
import { noop } from "../utils.js"
import {
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
  useHookHMRInvalidation,
} from "./utils.js"

export type UseAsyncResult<T> = (
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

type AsyncTaskState<T> = {
  deps: unknown[]
  promise: Promise<T>
  result: T | null
  loading: boolean
  error: Error | null
  invalidated?: boolean
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
  if (__DEV__) {
    useHookHMRInvalidation(...arguments)
  }
  return useHook(
    "useAsync",
    {
      task: null as AsyncTaskState<T> | null,
      load: noop as (
        deps: unknown[],
        func: () => Promise<T>,
        isInit: boolean
      ) => void,
    },
    ({ hook, isInit, update }) => {
      if (isInit) {
        if (__DEV__) {
          hook.debug = { get: () => ({ value: hook.task }) }
        }
        hook.cleanup = () => {
          if (hook.task) {
            hook.task.invalidated = true
          }
        }
        hook.load = (deps, func, isInit) => {
          if (hook.task) {
            hook.task.invalidated = true
          }
          const task: AsyncTaskState<T> = {
            deps,
            promise: func(),
            result: null,
            loading: true,
            error: null,
          }
          if (!isInit) update()
          task.promise
            .then((result: T) => {
              if (task.invalidated) return
              if (depsRequireChange(deps, task.deps)) {
                task.invalidated = true
                return
              }

              task.result = result
              task.loading = false
              task.error = null
              update()
            })
            .catch((error) => {
              if (task.invalidated) return
              if (depsRequireChange(deps, task.deps)) {
                task.invalidated = true
                return
              }

              task.result = null
              task.loading = false
              task.error = new UseAsyncError(error)
              update()
            })
          hook.task = task
        }
      }

      if (isInit || depsRequireChange(deps, hook.task?.deps)) {
        hook.load(deps, func, isInit)
      }

      return {
        data: hook.task?.result || null,
        loading: hook.task?.loading || false,
        error: hook.task?.error || null,
        invalidate: () => {
          if (hook.task) {
            hook.task.invalidated = true
            hook.task = null
          }
          hook.load(deps, func, isInit)
          //hook.load([], func, false)
        },
      } as UseAsyncResult<T>
    }
  )
}
