import { signalSymbol } from "./constants.js"
import { __DEV__ } from "./env.js"
import { node } from "./globals.js"
import { useHook } from "./hooks/utils.js"
import { getVNodeAppContext, sideEffectsEnabled } from "./utils.js"

export const signal = <T>(initial: T, displayName?: string) => {
  return !node.current || !sideEffectsEnabled()
    ? new Signal(initial, displayName)
    : useHook(
        "useSignal",
        { signal: undefined as any as Signal<T> },
        ({ hook, isInit }) => {
          if (isInit) {
            hook.signal = new Signal(initial, displayName)
            hook.cleanup = () => {
              Signal.subscribers(hook.signal).clear()
            }
            if (__DEV__) {
              hook.debug = {
                get: () => ({
                  displayName: hook.signal.displayName,
                  value: hook.signal.peek(),
                }),
                set: ({ value }) => {
                  hook.signal.sneak(value)
                },
              }
            }
          }
          return hook.signal
        }
      )
}

export const computed = <T>(
  getter: () => T,
  displayName?: string
): ReadonlySignal<T> => {
  if (!node.current) {
    const computed = Signal.makeReadonly(new Signal(null as T, displayName))
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
            Signal.subscribers(hook.signal).clear()
          }
          if (__DEV__) {
            hook.debug = {
              get: () => ({
                displayName: hook.signal.displayName,
                value: hook.signal.peek(),
              }),
            }
          }
          hook.subs = new Map()
          hook.signal = Signal.makeReadonly(new Signal(null as T, displayName))
          appliedTrackedSignals(getter, hook.signal, hook.subs)
        }

        return hook.signal
      }
    )
  }
}

export const watch = <T>(getter: () => T, deps?: Signal<unknown>[]) => {
  if (!node.current) {
    if (deps) {
      getter()
      deps.forEach((sig) => {
        sig.subscribe(getter)
      })
    } else {
      const subs = new Map<Signal<any>, Function>()
      appliedTrackedEffects(getter, subs)
    }
  } else {
    return useHook(
      "useWatch",
      {
        subs: null as any as Map<Signal<any>, Function>,
      },
      ({ hook, isInit }) => {
        if (isInit) {
          hook.subs = new Map()
          hook.cleanup = () => {
            hook.subs.forEach((fn) => fn())
            hook.subs.clear()
          }

          if (deps) {
            deps.forEach((sig) => {
              const unsub = sig.subscribe(getter)
              hook.subs.set(sig, unsub)
            })
          } else {
            appliedTrackedEffects(getter, hook.subs)
          }
        }
      }
    )
  }
}

export function unwrap(value: unknown) {
  return Signal.isSignal(value) ? value.peek() : value
}

export type ReadonlySignal<T> = Signal<T> & {
  readonly value: T
}
export interface SignalLike<T> {
  value: T
  peek(): T
  subscribe(callback: (value: T) => void): () => void
}
type SignalSubscriber = Kaioken.VNode | Function

export class Signal<T> {
  [signalSymbol] = true
  #value: T
  #subscribers = new Set<SignalSubscriber>()
  displayName?: string
  constructor(initial: T, displayName?: string) {
    this.#value = initial
    if (displayName) this.displayName = displayName
  }

  get value() {
    onSignalValueObserved(this)
    return this.#value
  }

  set value(next: T) {
    this.#value = next
    this.notify()
  }

  peek() {
    return this.#value
  }

  sneak(newValue: T) {
    this.#value = newValue
  }

  map<U>(fn: (value: T) => U, displayName?: string): ReadonlySignal<U> {
    const initialVal = fn(this.#value)
    const sig = Signal.makeReadonly(signal(initialVal, displayName))
    if (node.current && !sideEffectsEnabled()) return sig

    this.subscribe((value) => (sig.sneak(fn(value)), sig.notify()))
    return sig
  }

  toString() {
    onSignalValueObserved(this)
    return `${this.#value}`
  }

  subscribe(cb: (state: T) => void): () => void {
    this.#subscribers.add(cb)
    return () => (this.#subscribers.delete(cb), void 0)
  }

  notify(options?: { filter?: (sub: Function | Kaioken.VNode) => boolean }) {
    this.#subscribers.forEach((sub) => {
      if (options?.filter && !options.filter(sub)) return
      if (sub instanceof Function) {
        return sub(this.#value)
      }
      getVNodeAppContext(sub).requestUpdate(sub)
    })
  }

  static isSignal(x: any): x is Signal<any> {
    return typeof x === "object" && !!x && signalSymbol in x
  }

  static unsubscribe(sub: SignalSubscriber, signal: Signal<any>) {
    signal.#subscribers.delete(sub)
  }

  static subscribers(signal: Signal<any>) {
    return signal.#subscribers
  }

  static makeReadonly<T>(signal: Signal<T>): ReadonlySignal<T> {
    const desc = Object.getOwnPropertyDescriptor(signal, "value")
    if (desc && !desc.writable) return signal
    return Object.defineProperty(signal, "value", {
      get: function (this: Signal<T>) {
        onSignalValueObserved(this)
        return this.#value
      },
      configurable: true,
    })
  }
  static makeWritable<T>(signal: Signal<T>): Signal<T> {
    const desc = Object.getOwnPropertyDescriptor(signal, "value")
    if (desc && desc.writable) return signal
    return Object.defineProperty(signal, "value", {
      get: function (this: Signal<T>) {
        onSignalValueObserved(this)
        return this.#value
      },
      set: function (this: Signal<T>, value) {
        this.#value = value
        this.notify()
      },
      configurable: true,
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
  computedSignal.sneak(getter())
  isTracking = false

  if (node.current && !sideEffectsEnabled()) {
    trackedSignals = []
    return
  }

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

const appliedTrackedEffects = <T>(
  getter: () => T,
  subs: Map<Signal<any>, Function>
) => {
  isTracking = true
  getter()
  isTracking = false

  if (node.current && !sideEffectsEnabled()) {
    trackedSignals = []
    return
  }

  for (const [sig, unsub] of subs) {
    if (trackedSignals.includes(sig)) continue
    unsub()
    subs.delete(sig)
  }

  trackedSignals.forEach((dependencySignal) => {
    if (subs.get(dependencySignal)) return
    const unsub = dependencySignal.subscribe(() => {
      appliedTrackedEffects(getter, subs)
    })
    subs.set(dependencySignal, unsub)
  })

  trackedSignals = []
}

const onSignalValueObserved = (signal: Signal<any>) => {
  if (isTracking) {
    if (!node.current || (node.current && sideEffectsEnabled())) {
      trackedSignals.push(signal)
    }
    return
  }
  if (node.current) {
    if (!sideEffectsEnabled()) return
    if (!node.current.subs) node.current.subs = [signal]
    else if (node.current.subs.indexOf(signal) === -1)
      node.current.subs.push(signal)
    Signal.subscribers(signal).add(node.current)
  }
}
