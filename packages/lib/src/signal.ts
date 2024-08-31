import { signalSymbol } from "./constants.js"
import { __DEV__ } from "./env.js"
import { node, renderMode } from "./globals.js"
import { useHook } from "./hooks/utils.js"
import { getVNodeAppContext } from "./utils.js"

export const signal = <T>(initial: T) => {
  return !node.current
    ? new Signal(initial)
    : useHook(
        "useSignal",
        { signal: undefined as any as Signal<T> },
        ({ hook, isInit }) => {
          if (isInit) {
            hook.signal = new Signal(initial)
            if (__DEV__) {
              hook.debug = {
                get: () => ({ value: Signal.getValue(hook.signal) }),
                set: ({ value }) => {
                  Signal.setValueSilently(hook.signal, value)
                },
              }
            }
          }
          return hook.signal
        }
      )
}

let isTracking = false
let trackedSignals: Signal<any>[] = []

const appliedTrackedSubs = <T>(
  getter: () => T,
  _signal: Signal<any>,
  subbed: Signal<any>[]
) => {
  isTracking = true
  _signal.value = getter()
  isTracking = false

  // TODO: Should we unsub to all signals everytime we call this?
  //       This would match vues ref impl

  console.log(`tracked signals for ${_signal.displayName}`, trackedSignals)
  trackedSignals.forEach((signal) => {
    if (subbed.includes(signal)) return

    signal.subscribe(() => {
      appliedTrackedSubs(getter, _signal, subbed)
    })
    subbed.push(signal)
  })

  trackedSignals = []
}

export const computed = <T>(getter: () => T) => {
  if (!node.current) {
    const _signal = signal(null as T)
    const subbed: Signal<any>[] = []
    appliedTrackedSubs(getter, _signal, subbed)

    return _signal
  } else {
    return useHook(
      "useComputedSignal",
      { signal: undefined as any as Signal<T>, subbed: [] as Signal<any>[] },
      ({ hook, isInit }) => {
        if (isInit) {
          hook.signal = new Signal(null as T)
          appliedTrackedSubs(getter, hook.signal, hook.subbed)
        }

        return hook.signal
      }
    )
  }
}

export class Signal<T> {
  [signalSymbol] = true
  #value: T
  #subscribers = new Set<Kaioken.VNode | Function>()
  displayName?: string
  constructor(initial: T) {
    this.#value = initial
  }

  get value() {
    if (node.current) Signal.subscribeNode(node.current, this)
    if (isTracking) trackedSignals.push(this)
    return this.#value
  }

  set value(next: T) {
    this.#value = next
    this.notify()
  }

  toString() {
    if (node.current) Signal.subscribeNode(node.current, this)
    return `${this.#value}`
  }

  static isSignal(x: any): x is Signal<any> {
    return typeof x === "object" && !!x && signalSymbol in x
  }

  static setValueSilently<T>(signal: Signal<T>, value: T) {
    signal.#value = value
  }

  static getValue<T>(signal: Signal<T>): T {
    return signal.#value
  }

  static subscribeNode(node: Kaioken.VNode, signal: Signal<any>) {
    if (renderMode.current !== "dom" && renderMode.current !== "hydrate") return
    if (!node.subs) node.subs = [signal]
    else if (node.subs.indexOf(signal) === -1) node.subs.push(signal)
    signal.#subscribers.add(node)
  }

  static unsubscribeNode(node: Kaioken.VNode, signal: Signal<any>) {
    signal.#subscribers.delete(node)
  }

  subscribe(cb: (state: T) => void) {
    this.#subscribers.add(cb)
    return () => this.#subscribers.delete(cb)
  }

  notify() {
    this.#subscribers.forEach((sub) => {
      if (sub instanceof Function) {
        return sub(this.#value)
      }
      getVNodeAppContext(sub).requestUpdate(sub)
    })
  }
}
