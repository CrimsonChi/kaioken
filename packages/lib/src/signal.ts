import { SignalKey } from "./constants"
import { cleanupHook, useEffect, useHook } from "./hooks"
import { getCurrentNode, getNodeAppContext } from "./utils"

const tryToNodeSubscribe = (subscribers: Set<Kaioken.VNode | Function>) => {
  const vNode = getCurrentNode()
  if (vNode) {
    subscribers.add(vNode)
    // NOTE: we didn't use useEffect, because it was firing unexpectedly with useMemo (for unknown reasons)
    useHook('signalSubscribe', {}, ({ hook, oldHook }) => {
      if (!oldHook) {
        hook.cleanup = () => {
          subscribers.delete(vNode)
        }
      }
    })
  }
}

export const signal = <T>(initial: T) => {
  let value = initial
  const subscribers = new Set<Kaioken.VNode | Function>()

  const emitSubscribers = (newValue: T) => {
    subscribers.forEach((consumer) => {
      if (consumer instanceof Function) {
        consumer(newValue)
        return;
      }
      getNodeAppContext(consumer)?.requestUpdate(consumer)
    })
  }

  const signal = {
    [SignalKey]: true,
    get value() {
      tryToNodeSubscribe(subscribers);
      return value
    },
    set value(newValue) {
      value = newValue
      emitSubscribers(newValue)
    },
    toString() {
      tryToNodeSubscribe(subscribers);
      return `${value}`
    },
    subscribe: (cb: (state: T) => void) => {
      subscribers.add(cb)
      return (() => (subscribers.delete(cb), void 0)) as () => void
    },
  }

  const currentNode = getCurrentNode();
  if (currentNode) {
    return useHook('useSignal', { signal, }, ({ hook, }) => {
      return hook.signal
    })
  }

  return signal
}
