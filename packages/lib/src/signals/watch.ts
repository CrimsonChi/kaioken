import { __DEV__ } from "../env.js"
import { type CleanupInstance } from "./types.js"
import { type Signal } from "./base.js"
import type { HMRAccept } from "../hmr.js"
import { $HMR_ACCEPT } from "../constants.js"
import { node } from "../globals.js"
import { sideEffectsEnabled, useHook } from "../hooks/utils.js"
import { effectQueue, tracking } from "./globals.js"

export class WatchEffect {
  protected id: string
  protected getter: () => (() => void) | void
  protected unsubs: Map<Signal<any>, Function>
  protected cleanup?: CleanupInstance
  protected isRunning?: boolean
  protected [$HMR_ACCEPT]?: HMRAccept<WatchEffect>

  constructor(getter: () => (() => void) | void) {
    this.id = crypto.randomUUID()
    this.getter = getter
    this.unsubs = new Map()
    this.isRunning = false
    if (__DEV__) {
      this[$HMR_ACCEPT] = {
        provide: () => this,
        inject: (prev) => {
          if (prev.isRunning) return
          this.stop()
        },
        destroy: () => {
          this.stop()
        },
      }
    }
  }

  start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    /**
     * A tighter integration with HMR could see us
     * only needing to delay this during an HMR update.
     *
     * We postpone the callback until the next tick so that HMR
     * can persist any referenced signals.
     */
    queueMicrotask(() => {
      if (this.isRunning) {
        this.cleanup = appliedTrackedEffects(
          () => this.getter(),
          this.unsubs,
          this.id
        )
      }
    })
  }

  stop() {
    if (!this.isRunning) {
      return
    }

    effectQueue.delete(this.id)
    this.unsubs.forEach((fn) => fn())
    this.unsubs.clear()
    this.cleanup?.call?.()
    this.isRunning = false
  }

  static setGetter(watcher: WatchEffect, getter: () => (() => void) | void) {
    watcher.getter = getter
  }
}

export const watch = (getter: () => (() => void) | void) => {
  if (!node.current) {
    const watcher = new WatchEffect(getter)
    watcher.start()

    return watcher
  } else {
    return useHook(
      "useWatch",
      {
        watcher: null as any as WatchEffect,
      },
      ({ hook, isInit }) => {
        if (isInit) {
          hook.watcher = new WatchEffect(getter)
          hook.watcher.start()

          hook.cleanup = () => {
            hook.watcher.stop()
          }
        } else if (hook.watcher) {
          WatchEffect.setGetter(hook.watcher, getter)
        }

        return hook.watcher
      }
    )
  }
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
  tracking.enabled = true
  const func = getter()
  if (func) cleanup.call = func
  tracking.enabled = false

  if (node.current && !sideEffectsEnabled()) {
    tracking.signals.splice(0, tracking.signals.length)

    return cleanup
  }

  for (const [sig, unsub] of subs) {
    if (tracking.signals.includes(sig)) continue
    unsub()
    subs.delete(sig)
  }

  const cb = () => {
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
  }

  tracking.signals.forEach((dependencySignal) => {
    if (subs.get(dependencySignal)) return
    const unsub = dependencySignal.subscribe(cb)
    subs.set(dependencySignal, unsub)
  })

  tracking.signals.splice(0, tracking.signals.length)
  return cleanup
}
