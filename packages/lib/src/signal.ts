import { SignalKey } from "./constants.js"
import { node } from "./globals.js"
import { useHook } from "./hooks/utils.js"
import { getCurrentNode, getNodeAppContext } from "./utils.js"

const subscribeCurrentNode = (subscribers: Set<Kaioken.VNode | Function>) => {
  const n = node.current
  if (!n || subscribers.has(n)) return
  subscribers.add(n)
  // NOTE: we didn't use useEffect, because it was firing unexpectedly with useMemo (for unknown reasons)
  useHook("signalSubscribe", {}, ({ hook }) => {
    hook.cleanup = () => subscribers.delete(n)
  })
}

const emit = <T>(newValue: T, subscribers: Set<Kaioken.VNode | Function>) => {
  subscribers.forEach((consumer) => {
    if (consumer instanceof Function) {
      return consumer(newValue)
    }
    getNodeAppContext(consumer)?.requestUpdate(consumer)
  })
}

export const signal = <T>(initial: T) => {
  let value = initial
  const subscribers = new Set<Kaioken.VNode | Function>()

  const signal = {
    [SignalKey]: true,
    get value() {
      subscribeCurrentNode(subscribers)
      return value
    },
    set value(newValue) {
      value = newValue
      emit(newValue, subscribers)
    },
    toString() {
      subscribeCurrentNode(subscribers)
      return `${value}`
    },
    subscribe: (cb: (state: T) => void) => {
      subscribers.add(cb)
      return (() => (subscribers.delete(cb), void 0)) as () => void
    },
    notify: () => emit(value, subscribers),
  } as Kaioken.Signal<T>

  const currentNode = getCurrentNode()
  if (currentNode) {
    return useHook("useSignal", { signal }, ({ hook }) => {
      return hook.signal
    })
  }

  return signal
}
