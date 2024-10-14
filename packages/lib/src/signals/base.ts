import { $HMR_ACCEPT, $SIGNAL } from "../constants.js"
import { __DEV__ } from "../env.js"
import type { HMRAccept } from "../hmr.js"
import { getVNodeAppContext, sideEffectsEnabled } from "../utils.js"
import { tracking, signalSubsMap } from "./globals.js"
import { type SignalSubscriber, ReadonlySignal } from "./types.js"
import { node } from "../globals.js"
import { useHook } from "../hooks/utils.js"

export class Signal<T> {
  [$SIGNAL] = true
  protected $id: string
  protected $value: T
  displayName?: string;
  [$HMR_ACCEPT]?: HMRAccept<Signal<any>>
  constructor(initial: T, displayName?: string) {
    this.$id = crypto.randomUUID()
    signalSubsMap.set(this.$id, new Set())

    this.$value = initial
    if (displayName) this.displayName = displayName
    if (__DEV__) {
      this[$HMR_ACCEPT] = {
        provide: () => {
          return this as Signal<any>
        },
        inject: (prev) => {
          this.sneak(prev.value)

          signalSubsMap.get(this.$id)?.clear?.()
          signalSubsMap.delete(this.$id)
          this.$id = prev.$id
        },
        destroy: () => {},
      } satisfies HMRAccept<Signal<any>>
    }
  }

  get value() {
    Signal.entangle(this)
    return this.$value
  }

  set value(next: T) {
    this.$value = next
    this.notify()
  }

  peek() {
    return this.$value
  }

  sneak(newValue: T) {
    this.$value = newValue
  }

  toString() {
    Signal.entangle(this)
    return `${this.$value}`
  }

  subscribe(cb: (state: T) => void): () => void {
    const subs = signalSubsMap.get(this.$id)!
    subs!.add(cb)
    return () => {
      const subs = signalSubsMap.get(this.$id)!
      subs!.delete(cb)
    }
  }

  notify(options?: { filter?: (sub: Function | Kaioken.VNode) => boolean }) {
    const subs = signalSubsMap.get(this.$id)!
    subs.forEach((sub) => {
      if (options?.filter && !options.filter(sub)) return
      if (sub instanceof Function) {
        return sub(this.$value)
      }
      getVNodeAppContext(sub).requestUpdate(sub)
    })
  }

  static isSignal(x: any): x is Signal<any> {
    return typeof x === "object" && !!x && $SIGNAL in x
  }

  static unsubscribe(sub: SignalSubscriber, id: string) {
    const subs = signalSubsMap.get(id)!
    subs.delete(sub)
  }

  static subscribers(signal: Signal<any>) {
    return signalSubsMap.get(signal.$id)!
  }

  static makeReadonly<T>(signal: Signal<T>): ReadonlySignal<T> {
    const desc = Object.getOwnPropertyDescriptor(signal, "value")
    if (desc && !desc.writable) return signal
    return Object.defineProperty(signal, "value", {
      get: function (this: Signal<T>) {
        Signal.entangle(this)
        return this.$value
      },
      configurable: true,
    })
  }

  static makeWritable<T>(signal: Signal<T>): Signal<T> {
    const desc = Object.getOwnPropertyDescriptor(signal, "value")
    if (desc && desc.writable) return signal
    return Object.defineProperty(signal, "value", {
      get: function (this: Signal<T>) {
        Signal.entangle(this)
        return this.$value
      },
      set: function (this: Signal<T>, value) {
        this.$value = value
        this.notify()
      },
      configurable: true,
    })
  }

  static getId<T>(signal: Signal<T>) {
    return signal.$id
  }

  static entangle<T>(signal: Signal<T>) {
    if (tracking.enabled) {
      if (!node.current || (node.current && sideEffectsEnabled())) {
        tracking.signals.push(signal)
      }
      return
    }
    if (node.current) {
      if (!sideEffectsEnabled()) return
      if (!node.current.subs) node.current.subs = [signal.$id]
      else if (node.current.subs.indexOf(signal.$id) === -1)
        node.current.subs.push(signal.$id)
      Signal.subscribers(signal).add(node.current)
    }
  }
}

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
