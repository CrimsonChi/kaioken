import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

export function useSyncExternalStore<T>(
  subscribe: (callback: () => void) => () => void,
  getState: () => T,
  getServerState?: () => T
): T {
  if (!sideEffectsEnabled()) {
    if (getServerState === undefined) {
      throw new Error(
        "[kaioken]: useSyncExternalStore must receive a getServerSnapshot function if the component is rendered on the server."
      )
    }
    return getServerState()
  }

  return useHook(
    "useSyncExternalStore",
    {
      state: undefined as T,
      unsubscribe: noop as () => void,
    },
    ({ hook, isInit, update }) => {
      if (isInit) {
        hook.state = getState()
        console.log("hook subscribe")
        hook.unsubscribe = subscribe(() => {
          const newState = getState()
          if (Object.is(hook.state, newState)) return
          hook.state = newState
          update()
        })
        hook.cleanup = () => {
          hook.unsubscribe()
          console.log("hook unsubscribe")
          hook.unsubscribe = noop
        }
      }
      return hook.state
    }
  )
}
