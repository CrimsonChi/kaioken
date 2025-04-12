import { createContext, useContext, useSuspense } from "kaioken"

type PromiseCacheEntry<T> = {
  promise: Promise<T>
  fn: () => Promise<T>
}

export const PromiseCache = createContext<Map<string, PromiseCacheEntry<any>>>(
  null!
)

export function usePromise<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cache = useContext(PromiseCache)
  // @ts-ignore
  if ("window" in globalThis) {
    const serverData = useSuspense.resolve()
    console.log("resolved serverData", serverData)
  }
  if (!cache.has(key)) {
    cache.set(key, { promise: Object.assign(fn(), { key }), fn })
  }
  return cache.get(key)!.promise
}
