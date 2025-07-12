import { __DEV__ } from "../env.js"
import { Signal } from "./base.js"
import { effectQueue, signalSubsMap } from "./globals.js"
import { $HMR_ACCEPT } from "../constants.js"
import type { HMRAccept } from "../hmr.js"
import { useHook } from "../hooks/utils.js"
import { executeWithTracking } from "./effect.js"
import { latest } from "../utils.js"

export class ComputedSignal<T> extends Signal<T> {
  protected $getter: (prev?: T) => T
  protected $unsubs: Map<string, Function>
  protected $isDirty: boolean
  constructor(getter: (prev?: T) => T, displayName?: string) {
    super(void 0 as T, displayName)
    this.$getter = getter
    this.$unsubs = new Map()
    this.$isDirty = true

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
          this.$isDirty = prev.$isDirty
        },
        destroy: () => {},
      } satisfies HMRAccept<ComputedSignal<T>>
    }
  }

  get value() {
    if (this.$isDirty) {
      ComputedSignal.run(this)
    }
    ComputedSignal.entangle(this)
    return this.$value
  }

  // @ts-expect-error
  set value(next: T) {}

  subscribe(cb: (state: T) => void): () => void {
    if (this.$isDirty) {
      ComputedSignal.run(this)
    }
    return super.subscribe(cb)
  }

  static dispose(signal: ComputedSignal<any>): void {
    ComputedSignal.stop(signal)
    Signal.dispose(signal)
  }

  private static stop<T>(computed: ComputedSignal<T>) {
    const { $id, $unsubs } = latest(computed)

    effectQueue.delete($id)
    $unsubs.forEach((unsub) => unsub())
    $unsubs.clear()
    computed.$isDirty = true
  }

  private static run<T>(computed: ComputedSignal<T>) {
    const $computed = latest(computed)
    const { $id: id, $getter, $unsubs: subs } = $computed

    const value = executeWithTracking({
      id,
      subs,
      fn: () => $getter($computed.peek()),
      onDepChanged: () => {
        $computed.$isDirty = true
        if (!signalSubsMap?.get(id)?.size) return
        ComputedSignal.run($computed)
        $computed.notify()
      },
    })
    $computed.sneak(value)
    $computed.$isDirty = false
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
