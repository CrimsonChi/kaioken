import { $HMR_ACCEPT, $SIGNAL } from "../constants.js"
import { __DEV__ } from "../env.js"
import type { HMRAccept } from "../hmr.js"
import {
  getVNodeAppContext,
  latest,
  safeStringify,
  sideEffectsEnabled,
} from "../utils.js"
import { tracking, signalSubsMap } from "./globals.js"
import { type SignalSubscriber, ReadonlySignal } from "./types.js"
import { node } from "../globals.js"
import { useHook } from "../hooks/utils.js"
import { generateRandomID } from "../generateId.js"

export class Signal<T> {
  [$SIGNAL] = true;
  [$HMR_ACCEPT]?: HMRAccept<Signal<any>>
  displayName?: string
  private onBeforeRead?: () => void
  protected $id: string
  protected $value: T
  protected $initialValue?: string
  protected __next?: Signal<T>
  constructor(initial: T, displayName?: string) {
    this.$id = generateRandomID()
    signalSubsMap.set(this.$id, new Set())

    this.$value = initial
    if (displayName) this.displayName = displayName
    if (__DEV__) {
      this.$initialValue = safeStringify(initial)
      this[$HMR_ACCEPT] = {
        provide: () => {
          return this as Signal<any>
        },
        inject: (prev) => {
          if (this.$initialValue === prev.$initialValue) {
            this.$value = prev.$value
          }

          signalSubsMap.get(this.$id)?.clear?.()
          signalSubsMap.delete(this.$id)
          this.$id = prev.$id
          // @ts-ignore - this handles scenarios where a reference to the prev has been encapsulated
          // and we need to be able to refer to the latest version of the signal.
          prev.__next = this
        },
        destroy: () => {},
      } satisfies HMRAccept<Signal<any>>
    }
  }

  get value() {
    this.onBeforeRead?.()
    if (__DEV__) {
      const tgt = latest(this)
      Signal.entangle(tgt)
      return tgt.$value
    }
    Signal.entangle(this)
    return this.$value
  }

  set value(next: T) {
    if (__DEV__) {
      const tgt = latest(this)
      if (Object.is(tgt.$value, next)) return
      tgt.$value = next
      tgt.notify()
      return
    }
    if (Object.is(this.$value, next)) return
    this.$value = next
    this.notify()
  }

  peek() {
    this.onBeforeRead?.()
    if (__DEV__) {
      return latest(this).$value
    }
    return this.$value
  }

  sneak(newValue: T) {
    if (__DEV__) {
      const tgt = latest(this)
      tgt.$value = newValue
      return
    }
    this.$value = newValue
  }

  toString() {
    this.onBeforeRead?.()
    if (__DEV__) {
      const tgt = latest(this)
      Signal.entangle(tgt)
      return `${tgt.$value}`
    }
    Signal.entangle(this)
    return `${this.$value}`
  }

  subscribe(cb: (state: T) => void): () => void {
    const subs = signalSubsMap.get(this.$id)!
    subs!.add(cb)
    return () => signalSubsMap.get(this.$id)?.delete(cb)
  }

  notify(options?: { filter?: (sub: Function | Kaioken.VNode) => boolean }) {
    signalSubsMap.get(this.$id)?.forEach((sub) => {
      if (options?.filter && !options.filter(sub)) return
      if (typeof sub === "function") {
        if (__DEV__) {
          const value = latest(this).$value
          return sub(value)
        }
        return sub(this.$value)
      }
      getVNodeAppContext(sub).requestUpdate(sub)
    })
  }

  static isSignal(x: any): x is Signal<any> {
    return typeof x === "object" && !!x && $SIGNAL in x
  }

  static unsubscribe(sub: SignalSubscriber, id: string) {
    signalSubsMap.get(id)?.delete(sub)
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
    const vNode = node.current
    const trackedSignalObservations = tracking.current()
    if (trackedSignalObservations) {
      if (!vNode || (vNode && sideEffectsEnabled())) {
        trackedSignalObservations.set(signal.$id, signal)
      }
      return
    }
    if (!vNode || !sideEffectsEnabled()) return
    ;(vNode.subs ??= new Set()).add(signal.$id)
    Signal.subscribers(signal).add(vNode)
  }

  static configure(signal: Signal<any>, onBeforeRead?: () => void) {
    signal.onBeforeRead = onBeforeRead
  }

  static dispose(signal: Signal<any>) {
    signalSubsMap.delete(signal.$id)
  }
}

export const signal = <T>(initial: T, displayName?: string) => {
  return new Signal(initial, displayName)
}

export const useSignal = <T>(initial: T, displayName?: string) => {
  return useHook(
    "useSignal",
    { signal: null! as Signal<T> },
    ({ hook, isInit }) => {
      if (__DEV__) {
        hook.dev = {
          onRawArgsChanged: "persist",
          devtools: {
            get: () => ({
              displayName: hook.signal.displayName,
              value: hook.signal.peek(),
            }),
            set: ({ value }) => {
              hook.signal.value = value
            },
          },
        }
        if (isInit && hook.dev.rawArgsChanged) {
          hook.signal.value = initial
          return hook.signal
        }
      }
      if (isInit) {
        hook.cleanup = () => Signal.dispose(hook.signal)
        hook.signal = new Signal(initial, displayName)
      }
      return hook.signal
    }
  )
}
