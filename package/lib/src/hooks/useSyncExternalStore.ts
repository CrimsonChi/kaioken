import { g } from "../globalState.js"
import { getCurrentNode, getHook, setHook } from "./utils.js"

type StoreUnsubscriber = () => void
type StoreSubscriber<T> = (callback: (val: T) => void) => StoreUnsubscriber

export function useSyncExternalStore<T>(
  subscribeFunc: StoreSubscriber<T>,
  getDataFunc: () => T
): T {
  const node = getCurrentNode("useSyncExternalStore")
  if (!node) return getDataFunc()

  const { hook } = getHook<{ data?: T; cleanup?: () => void }>(node, {
    data: undefined,
    cleanup: undefined,
  })

  hook.data = getDataFunc()
  if (!hook.cleanup) {
    hook.cleanup = subscribeFunc((data) => {
      hook.data = data
      g.requestUpdate(node)
    })
  }

  setHook(node, hook)
  return hook.data
}
