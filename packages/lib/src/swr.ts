import { useHook } from "./hooks/utils.js"
import { Signal } from "./signals/base.js"
import {
  noop,
  deepCompare,
  safeStringify,
  sideEffectsEnabled,
} from "./utils.js"

export type UseSWRState<T> = (
  | {
      data: null
      error: null
      loading: true
    }
  | {
      data: T
      error: null
      loading: false
    }
  | {
      data: null
      error: UseSWRError
      loading: false
    }
) & {
  mutate: (callback: () => Promise<T>) => void
  isMutating: Signal<boolean>
  isValidating: Signal<boolean>
}

export class UseSWRError extends Error {
  constructor(message: unknown) {
    super(message instanceof Error ? message.message : String(message))
    this.name = "UseSWRError"
    this.cause = message
  }
}

export type SWRResourceState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

export type SWRRetryState = {
  count: number
  timeout: number
  delay: number
} | null

export type SWRCacheEntry<T> = {
  key: any
  resource: Signal<SWRResourceState<T>>
  fetcher: (args: any) => Promise<T>
  subscribers: Set<SWRHook>
  isMutating: Signal<boolean>
  isValidating: Signal<boolean>
  retryState: SWRRetryState
  options: SWROptions
  refreshInterval?: number
}

export type SWRCache = Map<string, SWRCacheEntry<any>>

export type SWROptions = {
  /**
   * Specify `false` to disable revalidation on focus
   */
  revalidateOnFocus?: boolean

  /**
   * Number of times to retry a failed fetch
   * @default Infinity
   */
  maxRetryCount?: number

  /**
   * Enable automatic refetching of stale data every `refreshInterval` milliseconds
   */
  refreshInterval?: number

  /**
   * Enable refetching of stale data when offline - useful for offline-first apps
   */
  refetchWhenOffline?: boolean
}

type SWRHook = Kaioken.Hook<{
  strKey: string
  options: SWROptions
  update: () => void
}>

type SWRTupleKey = readonly [any, ...unknown[]]
export type SWRKey =
  | string
  | SWRTupleKey
  | Record<any, any>
  | null
  | undefined
  | false

let SWR_GLOBAL_CACHE: SWRCache
let IS_ONLINE = false

if ("window" in globalThis) {
  SWR_GLOBAL_CACHE = window.__kaioken!.globalState[Symbol.for("SWR_GLOBAL")] ??=
    new Map()

  IS_ONLINE = navigator.onLine
  window.addEventListener("online", () => {
    IS_ONLINE = true
  })
  window.addEventListener("offline", () => {
    IS_ONLINE = false
  })

  let blurStart: number | null = null
  window.addEventListener("blur", () => {
    blurStart = Date.now()
  })
  window.addEventListener("focus", () => {
    const blurDuration = blurStart ? Date.now() - blurStart : 0
    blurStart = null
    if (blurDuration < 3_000) return // only trigger revalidation after 3 seconds

    SWR_GLOBAL_CACHE.forEach((entry) => {
      if (
        entry.subscribers.size === 0 ||
        entry.options.revalidateOnFocus === false ||
        (entry.options.refetchWhenOffline === false && IS_ONLINE === false)
      ) {
        return
      }

      entry.isValidating.value = true
      performFetch(entry, () => {
        entry.isValidating.value = false
      })
    })
  })
}

function createSWRCacheEntry<T, K extends SWRKey>(
  key: K,
  fetcher: (args: K) => Promise<T>
) {
  return {
    key,
    resource: new Signal<SWRResourceState<T>>({
      data: null,
      loading: true,
      error: null,
    }),
    fetcher,
    subscribers: new Set(),
    isMutating: new Signal(false),
    isValidating: new Signal(false),
    retryState: null,
    options: {},
  } satisfies SWRCacheEntry<T>
}

export function preloadSWR<T>(
  key: SWRKey,
  fetcher: (args: SWRKey) => Promise<T>
) {
  if (!("window" in globalThis)) return

  const strKey = safeStringify(key, { functions: false })
  if (!SWR_GLOBAL_CACHE.has(strKey)) {
    const entry = createSWRCacheEntry(key, fetcher)
    SWR_GLOBAL_CACHE.set(strKey, entry)
    performFetch(entry)
  }
}

export function getSWRState<T>(key: SWRKey): SWRCacheEntry<T> | null {
  const strKey = safeStringify(key, { functions: false })
  return SWR_GLOBAL_CACHE.get(strKey) ?? null
}

export function useSWR<T, K extends SWRKey>(
  key: K,
  fetcher: (args: K) => Promise<T>,
  options: SWROptions = {}
) {
  if (!sideEffectsEnabled())
    return { data: null, error: null, loading: true } as UseSWRState<T>

  return useHook(
    "useSWR",
    { strKey: "", options, update: noop } satisfies SWRHook,
    ({ hook, isInit, update }) => {
      hook.options = options
      const strKey = safeStringify(key, { functions: false })
      let entry: SWRCacheEntry<T>
      if (isInit || strKey !== hook.strKey) {
        if (strKey !== hook.strKey) {
          hook.cleanup?.()
        }
        hook.strKey = strKey
        hook.update = update

        let isNewEntry = false
        if (!SWR_GLOBAL_CACHE.has(strKey)) {
          isNewEntry = true
          entry = createSWRCacheEntry(key, fetcher)
          SWR_GLOBAL_CACHE.set(strKey, entry)

          entry.resource.subscribe(() => {
            entry.subscribers.forEach((sub) => sub.update())
          })

          performFetch(entry)
        }

        entry ??= SWR_GLOBAL_CACHE.get(strKey)!
        const subs = entry.subscribers
        if (subs.size === 0) {
          if (!isNewEntry) performFetch(entry)

          entry.options = options
          if (options.refreshInterval) {
            entry.refreshInterval = window.setInterval(() => {
              if (entry.subscribers.size === 0) return
              performFetch(entry)
            }, options.refreshInterval)
          }
        }
        subs.add(hook)
        hook.cleanup = () => {
          subs.delete(hook)
          if (entry.subscribers.size === 0) {
            window.clearInterval(entry.refreshInterval)
            window.clearTimeout(entry.retryState?.timeout)
          }
        }
      }

      entry ??= SWR_GLOBAL_CACHE.get(strKey)!
      const { resource, isMutating, isValidating } = entry
      const { data, loading, error } = resource.peek()

      const mutate: UseSWRState<T>["mutate"] = (callback) => {
        isMutating.value = true
        callback()
          .then((data) => {
            if (entry.retryState) {
              window.clearTimeout(entry.retryState.timeout)
              entry.retryState = null
              entry.isValidating.value = false
            }
            const prev = resource.peek().data
            if (deepCompare(prev, data)) return
            resource.value = {
              data,
              loading: false,
              error: null,
            }
          })
          .finally(() => {
            isMutating.value = false
          })
      }

      return {
        data,
        loading,
        error,
        isMutating,
        isValidating,
        mutate,
      } as UseSWRState<T>
    }
  )
}

function performFetch<T>(entry: SWRCacheEntry<T>, onSuccess?: () => void) {
  entry.fetcher(entry.key).then(
    (data) => {
      if (entry.retryState) {
        window.clearTimeout(entry.retryState.timeout)
        entry.retryState = null
      }
      const prev = entry.resource.peek().data
      if (!deepCompare(prev, data)) {
        entry.resource.value = {
          data,
          loading: false,
          error: null,
        }
      }

      onSuccess?.()
    },
    (error) => {
      entry.resource.value = {
        data: null,
        loading: false,
        error: new UseSWRError(error),
      }
      const retryState: SWRRetryState = (entry.retryState ??= {
        count: 0,
        timeout: 0,
        delay: 250,
      })
      if (retryState.count >= (entry.options.maxRetryCount ?? Infinity)) {
        return
      }

      retryState.timeout = window.setTimeout(() => {
        retryState.count++
        retryState.delay *= 2
        performFetch(entry, onSuccess)
      }, entry.retryState.delay)
    }
  )
}
