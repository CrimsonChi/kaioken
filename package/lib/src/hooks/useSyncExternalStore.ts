import { useHook } from "./utils.js"

type StoreUnsubscriber = () => void
type StoreSubscriber<T> = (callback: (val: T) => void) => StoreUnsubscriber

export function useSyncExternalStore<T>(
  subscriber: StoreSubscriber<T>,
  getter: () => T
): T {
  return useHook(
    "useSyncExternalStore",
    { data: undefined as T },
    ({ hook, update }) => {
      hook.data = getter()
      if (!hook.cleanup) {
        hook.cleanup = subscriber((data) => {
          hook.data = data
          update()
        })
      }
      return hook.data as T
    }
  )
}
