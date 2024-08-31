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

const appliedTrackedSignals = <T>(
  getter: () => T,
  _signal: Signal<any>,
  subbed: Signal<any>[]
) => {
  // NOTE: DO NOT call the signal notify method, UNTIL THE TRACKING PROCESS IS DONE
  isTracking = true
  Signal.setValueSilently(_signal, getter())
  isTracking = false

  // TODO: Should we unsub to all signals everytime we call this?
  //       This would match vues ref impl

  console.log(`tracked signals for ${_signal.displayName}`, trackedSignals)
  trackedSignals.forEach((signal) => {
    if (subbed.includes(signal)) return

    signal.subscribe(() => {
      appliedTrackedSignals(getter, _signal, subbed)
    })
    subbed.push(signal)
  })

  trackedSignals = []
  _signal.notify()
}

export const computed = <T>(getter: () => T, displayName?: string) => {
  if (!node.current) {
    const _signal = signal(null as T, displayName)
    const subbed: Signal<any>[] = []
    appliedTrackedSignals(getter, _signal, subbed)

    return _signal
  } else {
    return useHook(
      "useComputedSignal",
      { signal: undefined as any as Signal<T>, subbed: [] as Signal<any>[] },
      ({ hook, isInit }) => {
        if (isInit) {
          hook.signal = new Signal(null as T, displayName)
          appliedTrackedSignals(getter, hook.signal, hook.subbed)
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
