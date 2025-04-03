import { node } from "../globals.js"
import { __DEV__ } from "../env.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

export function useEffectEvent<T extends Function>(callback: T): T {
  if (!sideEffectsEnabled()) return callback
  return useHook("useEffectEvent", { callback }, ({ hook }) => {
    if (__DEV__) {
      hook.dev = {
        reinitUponRawArgsChanged: true,
      }
    }
    hook.callback = callback
    return function () {
      if (node.current) {
        throw new Error(
          "A function wrapped in useEffectEvent can't be called during rendering."
        )
      }
      return hook.callback.apply(void 0, arguments)
    } as any as T
  })
}
