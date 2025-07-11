import { __DEV__ } from "../env.js"
import { Signal } from "./base.js"
import { effectQueue, tracking } from "./globals.js"
import { $HMR_ACCEPT } from "../constants.js"
import type { HMRAccept } from "../hmr.js"
import { useHook } from "../hooks/utils.js"
import {
  executeWithTracking,
  cleanupStaleSubscriptions,
  applyTrackedSignals,
  createScheduledEffect,
  isServerRender,
} from "./effect.js"
import { latest } from "../utils.js"

export class ComputedSignal<T> extends Signal<T> {
  protected $getter: (prev?: T) => T
  protected $unsubs: Map<string, Function>
  constructor(getter: (prev?: T) => T, displayName?: string) {
    super(void 0 as T, displayName)
    this.$getter = getter
    this.$unsubs = new Map()

    if (__DEV__) {
      const inject = this[$HMR_ACCEPT]!.inject!
      // @ts-expect-error this is fine 😅
      this[$HMR_ACCEPT] = {
        provide: () => {
          return this
        },
        inject: (prev) => {
          inject(prev)

          ComputedSignal.stop(prev)
          ComputedSignal.run(this)
        },
        destroy: () => {},
      } satisfies HMRAccept<ComputedSignal<T>>
    }

    ComputedSignal.run(this)
  }

  get value() {
    ComputedSignal.entangle(this)
    return this.$value
  }

  // @ts-expect-error
  set value(next: T) {}

  static stop<T>(computed: ComputedSignal<T>) {
    const { $id, $unsubs } = computed
    effectQueue.delete($id)
    $unsubs.forEach((unsub) => unsub())
    $unsubs.clear()
  }

  static dispose(signal: ComputedSignal<any>): void {
    ComputedSignal.stop(signal)
    Signal.dispose(signal)
  }

  static run<T>(computed: ComputedSignal<T>) {
    const sig = latest(computed)
    const { $id, $getter, $unsubs } = sig

    effectQueue.delete($id)
    const value = executeWithTracking(() => $getter(sig.peek()))
    sig.sneak(value)

    if (!isServerRender()) {
      cleanupStaleSubscriptions($unsubs)
      const callback = createScheduledEffect($id, () => {
        ComputedSignal.run(sig)
        sig.notify()
      })
      applyTrackedSignals($unsubs, callback)
    }
    tracking.clear()
  }
}

export const computed = <T>(
  getter: (prev?: T) => T,
  displayName?: string
): ComputedSignal<T> => {
  return new ComputedSignal(getter, displayName)
}

export const useComputed = <T>(
  getter: (prev?: T) => T,
  displayName?: string
) => {
  return useHook(
    "useComputedSignal",
    {
      signal: null! as ComputedSignal<T>,
    },
    ({ hook, isInit, vNode }) => {
      if (__DEV__) {
        hook.dev = {
          devtools: {
            get: () => ({
              displayName: hook.signal.displayName,
              value: hook.signal.peek(),
            }),
          },
        }
        if (!isInit && vNode.hmrUpdated) {
          // isInit would be true if this is our initial render or if  the
          // getter was changed. In the case that our vNode was the subject
          // of an HMR update but the getter did not change, we're ensuring a
          // new signal is created to handle global signals being replaced.
          hook.cleanup?.()
          isInit = true
        }
      }
      if (isInit) {
        hook.cleanup = () => ComputedSignal.dispose(hook.signal)
        hook.signal = computed(getter, displayName)
      }

      return hook.signal
    }
  )
}
