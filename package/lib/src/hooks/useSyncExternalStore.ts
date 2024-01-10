import { useHook } from "./utils.js"

type StoreUnsubscriber = () => void
type StoreSubscriber<T> = (callback: (val: T) => void) => StoreUnsubscriber

export function useSyncExternalStore<T>(
  subscribeFunc: StoreSubscriber<T>,
  getDataFunc: () => T
): T {
  return useHook(
    "useSyncExternalStore",
    { data: undefined as T },
    ({ hook, node, requestUpdate }) => {
      hook.data = getDataFunc()
      if (!hook.cleanup) {
        hook.cleanup = subscribeFunc((data) => {
          hook.data = data
          requestUpdate(node)
        })
      }
      return hook.data as T
    }
  )
}
