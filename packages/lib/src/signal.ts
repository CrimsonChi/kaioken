import type { HMRAccept } from "./hmr"
import { $HMR_ACCEPT, $SIGNAL } from "./constants.js"
import { __DEV__ } from "./env.js"
import { node } from "./globals.js"
import { useHook } from "./hooks/utils.js"
import {
  getVNodeAppContext,
  sideEffectsEnabled,
  traverseApply,
} from "./utils.js"

type SignalDependency = {
  effectId: string
  subs: Map<Signal<any>, Function>
}

let computedToDependenciesMap: Map<Signal<any>, SignalDependency> | undefined

if (__DEV__) {
  computedToDependenciesMap = new Map()
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

export const computed = <T>(
  getter: () => T,
  displayName?: string
): ReadonlySignal<T> => {
  if (!node.current) {
    const computed = Signal.makeReadonly(
      new Signal(null as T, displayName),
      getter
    )
    const subs = new Map<Signal<any>, Function>()
    const id = crypto.randomUUID()
    appliedTrackedSignals(computed, subs, id)
    computedToDependenciesMap?.set(computed, {
      effectId: id,
      subs,
    })

    return computed
  } else {
    return useHook(
      "useComputedSignal",
      {
        signal: undefined as any as Signal<T>,
        subs: null as any as Map<Signal<any>, Function>,
        id: null as any as ReturnType<typeof crypto.randomUUID>,
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
          hook.id = crypto.randomUUID()
          hook.subs = new Map()
          hook.signal = Signal.makeReadonly(
            new Signal(null as T, displayName),
            getter
          )
          appliedTrackedSignals(hook.signal, hook.subs, hook.id)
          computedToDependenciesMap?.set(hook.signal, {
            effectId: hook.id,
            subs: hook.subs,
          })
        }

        return hook.signal
      }
    )
  }
}

export const watch = (getter: () => (() => void) | void) => {
  if (!node.current) {
    const subs = new Map<Signal<any>, Function>()
    const id = crypto.randomUUID()
    appliedTrackedEffects(getter, subs, id)
  } else {
    return useHook(
      "useWatch",
      {
        subs: null as any as Map<Signal<any>, Function>,
        id: null as any as string,
      },
      ({ hook, isInit }) => {
        if (isInit) {
          hook.id = crypto.randomUUID()
          hook.subs = new Map()
          const cleanup = appliedTrackedEffects(getter, hook.subs, hook.id)
          hook.cleanup = () => {
            hook.subs.forEach((fn) => fn())
            hook.subs.clear()
            cleanup?.call?.()
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
  [$SIGNAL] = true
  #value: T
  #subscribers = new Set<SignalSubscriber>()
  #getter?: () => T
  displayName?: string;
  [$HMR_ACCEPT]?: HMRAccept<Signal<any>>
  constructor(initial: T, displayName?: string) {
    this.#value = initial
    if (displayName) this.displayName = displayName
    if (__DEV__) {
      this[$HMR_ACCEPT] = {
        provide: () => {
          return this as Signal<any>
        },
        inject: (prev) => {
          this.sneak(prev.value)
          Signal.subscribers(prev).forEach((sub) =>
            Signal.subscribers(this).add(sub)
          )
          if (computedToDependenciesMap!.get(prev)) {
            const subs = new Map<Signal<any>, Function>()
            const { effectId } = computedToDependenciesMap!.get(prev)!
            appliedTrackedSignals(this, subs, effectId)
            computedToDependenciesMap!.set(this, {
              effectId,
              subs,
            })
          }
          window.__kaioken?.apps.forEach((app) => {
            traverseApply(app.rootNode!, (vNode) => {
              if (typeof vNode.type !== "function") return
              if (vNode.subs === undefined) return
              const idx = vNode.subs.findIndex((sub) => sub === prev)
              if (idx === -1) return
              vNode.subs[idx] = this
            })
          })
          this.notify()
        },
        destroy: () => {
          computedToDependenciesMap!.forEach(({ subs }) => {
            const unsub = subs.get(this)
            if (unsub) {
              unsub()
              subs.delete(this)
            }
          })
          computedToDependenciesMap!.delete(this)
          Signal.subscribers(this).clear()
        },
      } satisfies HMRAccept<Signal<any>>
    }
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
    return typeof x === "object" && !!x && $SIGNAL in x
  }

  static unsubscribe(sub: SignalSubscriber, signal: Signal<any>) {
    signal.#subscribers.delete(sub)
  }

  static subscribers(signal: Signal<any>) {
    return signal.#subscribers
  }

  static makeReadonly<T>(
    signal: Signal<T>,
    getter?: () => T
  ): ReadonlySignal<T> {
    const desc = Object.getOwnPropertyDescriptor(signal, "value")
    signal.#getter = getter
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
  static getComputedGetter<T>(signal: Signal<T>) {
    if (!signal.#getter)
      throw new Error("attempted to get computed getter on non-computed signal")
    return signal.#getter
  }
}

let isTracking = false
let trackedSignals: Signal<any>[] = []
const effectQueue = new Map<string, Function>()

const appliedTrackedSignals = (
  computedSignal: ReadonlySignal<any>,
  subs: Map<Signal<any>, Function>,
  effectId: string
) => {
  if (effectQueue.has(effectId)) {
    effectQueue.delete(effectId)
  }
  const getter = Signal.getComputedGetter(computedSignal)
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
      if (!effectQueue.has(effectId)) {
        queueMicrotask(() => {
          if (effectQueue.has(effectId)) {
            const func = effectQueue.get(effectId)!
            func()
          }
        })
      }

      effectQueue.set(effectId, () => {
        appliedTrackedSignals(computedSignal, subs, effectId)
      })
    })
    subs.set(dependencySignal, unsub)
  })

  trackedSignals = []
  computedSignal.notify()
}

type CleanupInstance = {
  call?(): void
}

const appliedTrackedEffects = (
  getter: () => (() => void) | void,
  subs: Map<Signal<any>, Function>,
  effectId: string,
  cleanupInstance?: CleanupInstance
) => {
  const cleanup = cleanupInstance ?? ({} as CleanupInstance)

  if (effectQueue.has(effectId)) {
    effectQueue.delete(effectId)
  }
  isTracking = true
  const func = getter()
  if (func) cleanup.call = func
  isTracking = false

  if (node.current && !sideEffectsEnabled()) {
    trackedSignals = []
    return cleanup
  }

  for (const [sig, unsub] of subs) {
    if (trackedSignals.includes(sig)) continue
    unsub()
    subs.delete(sig)
  }

  trackedSignals.forEach((dependencySignal) => {
    if (subs.get(dependencySignal)) return
    const unsub = dependencySignal.subscribe(() => {
      if (!effectQueue.has(effectId)) {
        queueMicrotask(() => {
          if (effectQueue.has(effectId)) {
            const func = effectQueue.get(effectId)!
            func()
          }
        })
      }

      effectQueue.set(effectId, () => {
        cleanup.call?.()
        appliedTrackedEffects(getter, subs, effectId, cleanup)
      })
    })
    subs.set(dependencySignal, unsub)
  })

  trackedSignals = []
  return cleanup
}

export const tick = () => {
  const keys = [...effectQueue.keys()]
  keys.forEach((id) => {
    const func = effectQueue.get(id)
    if (func) {
      func()
      effectQueue.delete(id)
    }
  })
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
