import { signalSymbol } from "./constants.js"
import { __DEV__ } from "./env.js"
import { node, renderMode } from "./globals.js"
import { useHook } from "./hooks/utils.js"
import { getVNodeAppContext } from "./utils.js"

export const signal = <T>(initial: T, displayName?: string) => {
  return !node.current
    ? new Signal(initial, displayName)
    : useHook(
        "useSignal",
        { signal: undefined as any as Signal<T> },
        ({ hook, isInit }) => {
          if (isInit) {
            hook.signal = new Signal(initial, displayName)
            hook.cleanup = () => {
              Signal.clearSubscribers(hook.signal)
            }
            if (__DEV__) {
              hook.debug = {
                get: () => ({
                  displayName: hook.signal.displayName,
                  value: Signal.getValue(hook.signal),
                }),
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

export const computed = <T>(getter: () => T, displayName?: string) => {
  if (!node.current) {
    const computed = signal(null as T, displayName)
    const subs = new Map<Signal<any>, Function>()
    appliedTrackedSignals(getter, computed, subs)

    return computed
  } else {
    return useHook(
      "useComputedSignal",
      {
        signal: undefined as any as Signal<T>,
        subs: null as any as Map<Signal<any>, Function>,
      },
      ({ hook, isInit }) => {
        if (isInit) {
          hook.cleanup = () => {
            hook.subs.forEach((fn) => fn())
            hook.subs.clear()
            Signal.clearSubscribers(hook.signal)
          }
          if (__DEV__) {
            hook.debug = {
              get: () => ({
                displayName: hook.signal.displayName,
                value: Signal.getValue(hook.signal),
              }),
            }
          }
          hook.subs = new Map()
          hook.signal = new Signal(null as T, displayName)
          appliedTrackedSignals(getter, hook.signal, hook.subs)
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
  constructor(initial: T, displayName?: string) {
    this.#value = initial
    if (displayName) this.displayName = displayName
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

  static clearSubscribers(signal: Signal<any>) {
    signal.#subscribers.clear()
  }

  peek() {
    return this.#value
  }

  map<U>(fn: (value: T) => U, displayName?: string): Signal<U> {
    const initialVal = fn(this.#value)
    const sig = signal(initialVal, displayName)
    this.subscribe((value) => (sig.value = fn(value)))
    return sig
  }

  toString() {
    if (node.current) Signal.subscribeNode(node.current, this)
    return `${this.#value}`
  }

  subscribe(cb: (state: T) => void) {
    this.#subscribers.add(cb)
    return () => this.#subscribers.delete(cb)
  }

  notify(filterPredicate?: (sub: Function | Kaioken.VNode) => boolean) {
    this.#subscribers.forEach((sub) => {
      if (filterPredicate && !filterPredicate(sub)) return
      if (sub instanceof Function) {
        return sub(this.#value)
      }
      getVNodeAppContext(sub).requestUpdate(sub)
    })
  }
}

let isTracking = false
let trackedSignals: Signal<any>[] = []

const appliedTrackedSignals = <T>(
  getter: () => T,
  computedSignal: Signal<any>,
  subs: Map<Signal<any>, Function>
) => {
  // NOTE: DO NOT call the signal notify method, UNTIL THE TRACKING PROCESS IS DONE
  isTracking = true
  Signal.setValueSilently(computedSignal, getter())
  isTracking = false

  for (const [sig, unsub] of subs) {
    if (trackedSignals.includes(sig)) continue
    unsub()
    subs.delete(sig)
  }

  trackedSignals.forEach((dependencySignal) => {
    if (subs.get(dependencySignal)) return
    const unsub = dependencySignal.subscribe(() => {
      appliedTrackedSignals(getter, computedSignal, subs)
    })
    subs.set(dependencySignal, unsub)
  })

  trackedSignals = []
  computedSignal.notify()
}
