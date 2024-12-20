import { node } from "../globals.js"
import { KaiokenError } from "../error.js"
import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"
import { __DEV__ } from "../env.js"

export function useSyncExternalStore<T>(
  subscribe: (callback: () => void) => () => void,
  getState: () => T,
  getServerState?: () => T
): T {
  if (!sideEffectsEnabled()) {
    if (getServerState === undefined) {
      throw new KaiokenError({
        message:
          "useSyncExternalStore must receive a getServerSnapshot function if the component is rendered on the server.",
        vNode: node.current,
      })
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
        if (__DEV__) {
          hook.debug = { get: () => ({ value: hook.state }) }
        }
        hook.state = getState()
        hook.unsubscribe = subscribe(() => {
          const newState = getState()
          if (Object.is(hook.state, newState)) return
          hook.state = newState
          update()
        })
        hook.cleanup = () => {
          hook.unsubscribe()
          hook.unsubscribe = noop
        }
      }
      return hook.state
    }
  )
}
