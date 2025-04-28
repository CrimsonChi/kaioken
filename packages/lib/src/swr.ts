import { useHook } from "./hooks/utils.js"
import { Signal } from "./signals/base.js"
import { noop, safeStringify, sideEffectsEnabled } from "./utils.js"

type UseSWRReturn<T> = (
  | {
      data: null
      error: null
      isLoading: true
    }
  | {
      data: T
      error: null
      isLoading: false
    }
  | {
      data: T | null
      error: Error
      isLoading: false
    }
) & {
  mutate: (callback: () => Promise<T>) => void
  isMutating: boolean
  isValidating: boolean
}

export class UseSWRError extends Error {
  constructor(message: unknown) {
    super(message instanceof Error ? message.message : String(message))
    this.name = "UseSWRError"
    this.cause = message
  }
}

type SWRResourceState<T> = {
  data: T | null
  isLoading: boolean
  error: Error | null
  isMutating: boolean
  isValidating: boolean
}

type SWRGlobalStateEntry<T> = {
  key: any
  resource: Signal<SWRResourceState<T>>
  fetcher: (args: any) => Promise<T>
  subscribers: Set<SWRHook>
}

type SWRGlobalState = {
  [key: string]: SWRGlobalStateEntry<any>
}

let SWR_GLOBAL: SWRGlobalState

if ("window" in globalThis) {
  SWR_GLOBAL = window.__kaioken!.globalState[Symbol.for("SWR_GLOBAL")] ??= {}
  window.addEventListener("focus", () => {
    for (const strKey in SWR_GLOBAL) {
      const { key, resource, fetcher, subscribers } = SWR_GLOBAL[strKey]
      const revalidators = subscribers
        .values()
        .filter(({ options }) => options.revalidateOnFocus !== false)
        .toArray()

      if (revalidators.length === 0) continue

      resource.value.isValidating = true
      revalidators.forEach(({ update }) => update())

      fetcher(key).then(
        (data) => {
          resource.value = {
            data,
            isLoading: false,
            error: null,
            isMutating: false,
            isValidating: false,
          }
        },
        (error) => {
          resource.value = {
            data: null,
            isLoading: false,
            error: new UseSWRError(error),
            isMutating: false,
            isValidating: false,
          }
        }
      )
    }
  })
}

type SWROptions = {
  revalidateOnFocus?: boolean
}

type SWRHook = Kaioken.Hook<{
  strKey: string
  options: SWROptions
  update: () => void
}>

type SWRTupleKey = readonly [any, ...unknown[]]
type SWRKey = string | SWRTupleKey | Record<any, any> | null | undefined | false

export function useSWR<T, K extends SWRKey>(
  key: K,
  fetcher: (args: K) => Promise<T>,
  options: SWROptions = {}
) {
  if (!sideEffectsEnabled())
    return { data: null, error: null, isLoading: true } as UseSWRReturn<T>

  return useHook(
    "useSWR",
    { strKey: "", options, update: noop } satisfies SWRHook,
    ({ hook, isInit, update }) => {
      hook.options = options
      const strKey = safeStringify(key)
      if (isInit || strKey !== hook.strKey) {
        hook.strKey = strKey
        hook.update = update

        if (!SWR_GLOBAL[strKey]) {
          const { resource, subscribers } = (SWR_GLOBAL[strKey] = {
            key,
            resource: new Signal<SWRResourceState<any>>({
              data: null,
              isLoading: true,
              error: null,
              isMutating: false,
              isValidating: false,
            }),
            fetcher,
            subscribers: new Set(),
          })

          resource.subscribe(() => {
            subscribers.forEach(({ update }) => update())
          })

          fetcher(key).then(
            (result) => {
              resource.value = {
                data: result,
                isLoading: false,
                error: null,
                isMutating: false,
                isValidating: false,
              }
            },
            (error) => {
              resource.value = {
                data: null,
                isLoading: false,
                error: new UseSWRError(error),
                isMutating: false,
                isValidating: false,
              }
            }
          )
        }

        const subs = SWR_GLOBAL[strKey].subscribers
        subs.add(hook)
        hook.cleanup = () => subs.delete(hook)
      }

      const resource = SWR_GLOBAL[strKey].resource as Signal<
        SWRResourceState<T>
      >
      const { data, isLoading, error, isMutating, isValidating } =
        resource.peek()
      return {
        data,
        isLoading,
        error,
        isMutating,
        isValidating,
        mutate: (callback) => {
          resource.value = {
            data,
            isLoading: false,
            error: null,
            isMutating: true,
            isValidating: false,
          }
          callback().then(
            (result) => {
              resource.value = {
                data: result,
                isLoading: false,
                error: null,
                isMutating: false,
                isValidating: false,
              }
            },
            (error) => {
              resource.value = {
                data,
                isLoading: false,
                error: new UseSWRError(error),
                isMutating: false,
                isValidating: false,
              }
            }
          )
        },
      } as UseSWRReturn<T>
    }
  )
}

// function abortTask<T>(task: SWRTaskState<T> | null): void {
//   if (task === null || task.abortController?.signal.aborted) return
//   task.abortController?.abort()
// }
