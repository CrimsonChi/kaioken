import { g } from "../globalState.js"
import { getCurrentNode, getHook, cleanupHook, setHook } from "./utils.js"

type StoreUnsubscriber = () => void
type StoreSubscriber<T> = (callback: (val: T) => void) => StoreUnsubscriber

export function useSyncExternalStore<T>(
  subscribeFunc: StoreSubscriber<T>,
  getDataFunc: () => T
): T {
  const node = getCurrentNode(
    "useSyncExternalStore must be called in a component"
  )
  if (!node) return getDataFunc()

  const { hook, oldHook } = getHook<{ data?: T; cleanup?: () => void }>(node, {
    data: undefined,
    cleanup: undefined,
  })
  if (oldHook) {
    cleanupHook(oldHook)
  }

  hook.data = getDataFunc()
  hook.cleanup = subscribeFunc((data) => {
    hook.data = data
    g.setWipNode(node)
  })

  setHook(node, hook)
  return hook.data
}
