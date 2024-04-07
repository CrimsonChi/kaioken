import { SignalKey } from "./constants"
import { cleanupHook, shouldExecHook, useHook } from "./hooks"
import { getCurrentNode, noop } from "./utils"

export const createSignal = <T>(initial: T) => {
  let value = initial
  const subscribers = new Set<Function>()

  const emitSubscribers = (newValue: T) => {
    subscribers.forEach((cb) => {
      cb(newValue)
    })
  }

  const useSignal = () => {
    if (!shouldExecHook()) {
      return Object.assign(noop, {
        [SignalKey]: true,
        value,
        toString() {
          return value
        },
      }) as any as Kaioken.Signal<T>
    }

    return useHook(
      "useSignal",
      {
        signal: undefined as Kaioken.Signal<T> | undefined,
      },
      ({ hook, oldHook, update }) => {
        if (!oldHook) {
          const subCb = (_: any) => {
            update()
          }
          hook.signal = {
            [SignalKey]: true,
            get value() {
              return value
            },

            set value(newValue) {
              value = newValue
              emitSubscribers(newValue)
            },

            toString() {
              return `${value}`
            },
          } as any as Kaioken.Signal<T>

          subscribers.add(subCb)
          hook.cleanup = () => {
            subscribers.delete(subCb)
          }
        }

        return hook.signal as any as Kaioken.Signal<T>
      }
    )
  }

  // if this is called inside of a kaioken context, we just use skip over to the hook
  if (getCurrentNode()) {
    return useSignal()
  }

  const globalSignal = Object.assign(useSignal, {
    _signal: true,
    toString() {
      return `${value}`
    },
    subscribe: (cb: (state: T) => void) => {
      subscribers.add(cb)
      return (() => (subscribers.delete(cb), void 0)) as () => void
    },
  })

  Object.defineProperty(globalSignal, "value", {
    get() {
      return value
    },
    set(newValue) {
      value = newValue
      emitSubscribers(newValue)
    },
  })

  return globalSignal as any as Kaioken.Signal<T>
}
