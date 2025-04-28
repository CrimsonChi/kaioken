import { useHook } from "./hooks/utils.js"
import { Signal } from "./signals/base.js"
import { safeStringify, sideEffectsEnabled } from "./utils.js"

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
  subscribers: Set<[SWROptions, () => void]>
}

type SWRGlobalState = {
  [key: string]: SWRGlobalStateEntry<any>
}

const $SWR_GLOBAL = Symbol.for("SWR_GLOBAL")
let SWR_GLOBAL: SWRGlobalState

if ("window" in globalThis) {
  SWR_GLOBAL = window.__kaioken!.globalState[$SWR_GLOBAL] ??= {}
  let didBlur = false

  window.addEventListener("blur", () => {
    didBlur = true
    console.log("blur 123")
  })
  window.addEventListener("focus", () => {
    if (didBlur) {
      didBlur = false
      console.log("focus")
      for (const strKey in SWR_GLOBAL) {
        const { key, resource, fetcher, subscribers } = SWR_GLOBAL[strKey]
        if (
          subscribers
            .values()
            .every(([options]) => options.revalidateOnFocus === false)
        ) {
          continue
        }

        resource.value = {
          data: resource.peek().data,
          isLoading: false,
          error: null,
          isMutating: false,
          isValidating: true,
        }

        console.log("revalidating", key)

        fetcher(key).then(
          (data) => {
            resource.value = {
              data,
              isLoading: false,
              error: null,
              isMutating: false,
              isValidating: false,
            }
            resource.notify()
          },
          (error) => {
            resource.value = {
              data: null,
              isLoading: false,
              error,
              isMutating: false,
              isValidating: false,
            }
            resource.notify()
          }
        )
      }
    }
  })
}

type SWROptions = {
  revalidateOnFocus?: boolean
}

export function useSWR<T, K extends string = any>(
  key: K,
  fetcher: (args: K) => Promise<T>,
  options: SWROptions = {}
) {
  if (!sideEffectsEnabled())
    return { data: null, error: null, isLoading: true } as UseSWRReturn<T>

  return useHook("useSWR", { strKey: "" }, ({ hook, isInit, update }) => {
    const strKey = safeStringify(key)
    if (isInit || strKey !== hook.strKey) {
      hook.strKey = strKey

      // todo: base subscription on hook ref, unsub when key changes

      let sub: [SWROptions, () => void] = [options, update]
      if (!SWR_GLOBAL[strKey]) {
        const state = (SWR_GLOBAL[strKey] = {
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

        state.resource.subscribe(() => {
          state.subscribers.forEach(([, update]) => update())
        })

        fetcher(key).then(
          (result) => {
            state.resource.value = {
              data: result,
              isLoading: false,
              error: null,
              isMutating: false,
              isValidating: false,
            }
          },
          (error) => {
            state.resource.value = {
              data: null,
              isLoading: false,
              error: new UseSWRError(error),
              isMutating: false,
              isValidating: false,
            }
          }
        )
        hook.cleanup = () => {
          SWR_GLOBAL[strKey].subscribers.delete(sub)
        }
      }

      SWR_GLOBAL[strKey].subscribers.add(sub)
      hook.cleanup = () => {
        SWR_GLOBAL[strKey].subscribers.delete(sub)
      }
    }

    const resource = SWR_GLOBAL[strKey].resource as Signal<SWRResourceState<T>>
    const { data, isLoading, error, isMutating } = resource.peek()
    return {
      data,
      isLoading,
      error,
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
      isMutating,
    } as UseSWRReturn<T>
  })
}

// function abortTask<T>(task: SWRTaskState<T> | null): void {
//   if (task === null || task.abortController?.signal.aborted) return
//   task.abortController?.abort()
// }
