import { cleanupHook, shouldExecHook, useHook } from "./utils.js"
import { SignalKey } from "../constants.js"

export function useSignal<T>(signal: Kaioken.Signal<T>) {
  if (!shouldExecHook()) {
    return signal
  }

  return useHook(
    "useSignal",
    {
      value: signal.value,
      signal: undefined as Kaioken.Signal<T> | undefined,
    },
    ({ hook, oldHook, update }) => {
      if (oldHook) {
        cleanupHook(oldHook)
      }
      if (!oldHook) {
        const subCb = (_: any) => {
          update()
        }
        
        hook.signal = {
          [SignalKey]: true,
          get value() {
            return hook.value
          },

          set value(newValue) {
            hook.value = signal.value
          },

          toString() {
            return `${hook.value}`
          },
        } as any as Kaioken.Signal<T>
      }



      return hook.signal as any as Kaioken.Signal<T>
    }
  )
}
