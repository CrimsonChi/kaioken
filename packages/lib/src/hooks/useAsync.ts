import { __DEV__ } from "../env.js"
import { noop } from "../utils.js"
import {
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
  useHookHMRInvalidation,
} from "./utils.js"

export type UseAsyncState<T> = (
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

export type UseAsyncCallbackContext = {
  abortSignal: AbortSignal
}

export class UseAsyncError extends Error {
  constructor(message: unknown) {
    super(message instanceof Error ? message.message : String(message))
    this.name = "UseAsyncError"
    this.cause = message
  }
}

type AsyncTaskState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  abortController: AbortController
}

export function useAsync<T>(
  func: (ctx: UseAsyncCallbackContext) => Promise<T>,
  deps: unknown[]
): UseAsyncState<T> {
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
      deps,
      iter: 0,
      task: null as any as AsyncTaskState<T>,
      load: noop as (
        func: (ctx: UseAsyncCallbackContext) => Promise<T>
      ) => void,
    },
    ({ hook, isInit, update }) => {
      if (isInit) {
        if (__DEV__) {
          hook.debug = { get: () => ({ value: hook.task }) }
        }
        hook.cleanup = () => abortTask(hook.task)
        hook.load = (func) => {
          hook.iter++
          let invalidated = false
          const abortController = new AbortController()
          abortController.signal.addEventListener("abort", () => {
            invalidated = true
          })
          const id = hook.iter
          const task: AsyncTaskState<T> = (hook.task = {
            abortController,
            data: null,
            loading: true,
            error: null,
          })
          func({ abortSignal: abortController.signal })
            .then((result: T) => {
              if (id !== hook.iter) abortTask(task)
              if (invalidated) return

              task.data = result
              task.loading = false
              task.error = null
              update()
            })
            .catch((error) => {
              if (id !== hook.iter) abortTask(task)
              if (invalidated) return

              task.data = null
              task.loading = false
              task.error = new UseAsyncError(error)
              update()
            })
        }
      }

      if (isInit || depsRequireChange(deps, hook.deps)) {
        abortTask(hook.task)
        hook.deps = deps
        hook.load(func)
      }

      const { abortController, ...rest } = hook.task
      return {
        ...rest,
        invalidate: () => {
          abortTask(hook.task)
          hook.load(func)
          update()
        },
      } as UseAsyncState<T>
    }
  )
}

function abortTask<T>(task: AsyncTaskState<T> | null): void {
  if (task === null || task.abortController.signal.aborted) return
  task.abortController.abort()
}
