import { __DEV__ } from "../env.js"
import type { HMRAccept } from "../hmr.js"
import { $HMR_ACCEPT } from "../constants.js"
import { sideEffectsEnabled, useHook } from "../hooks/utils.js"
import { effectQueue, tracking } from "./globals.js"
import { generateRandomID } from "../generateId.js"
import {
  executeWithTracking,
  cleanupStaleSubscriptions,
  applyTrackedSignals,
  createScheduledEffect,
  isServerRender,
} from "./effect.js"
import { latest } from "../utils.js"

export class WatchEffect {
  protected id: string
  protected getter: () => (() => void) | void
  protected unsubs: Map<string, Function>
  protected cleanup: (() => void) | null
  protected isRunning?: boolean
  protected [$HMR_ACCEPT]?: HMRAccept<WatchEffect>

  constructor(getter: () => (() => void) | void) {
    this.id = generateRandomID()
    this.getter = getter
    this.unsubs = new Map()
    this.isRunning = false
    this.cleanup = null
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
      if ("window" in globalThis) {
        const signals = window.__kaioken!.HMRContext!.signals
        if (signals.isWaitingForNextWatchCall()) {
          signals.pushWatch(this)
        }
      }
    }
    this.start()
  }

  start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    if (__DEV__) {
      // postpone execution during HMR
      if (
        "window" in globalThis &&
        window.__kaioken?.HMRContext?.isReplacement()
      ) {
        return queueMicrotask(() => {
          if (this.isRunning) {
            WatchEffect.run(this)
          }
        })
      }
    }
    WatchEffect.run(this)
  }

  stop() {
    effectQueue.delete(this.id)
    this.unsubs.forEach((fn) => fn())
    this.unsubs.clear()
    this.cleanup?.()
    this.cleanup = null
    this.isRunning = false
  }

  static run(watchEffect: WatchEffect) {
    const effect = latest(watchEffect)
    const { id, getter, unsubs } = effect

    effectQueue.delete(id)
    effect.cleanup = executeWithTracking(getter) ?? null

    if (isServerRender()) {
      return tracking.clear()
    }
    cleanupStaleSubscriptions(unsubs)

    const callback = createScheduledEffect(id, () => {
      effect.cleanup?.()
      WatchEffect.run(effect)
    })
    applyTrackedSignals(unsubs, callback)
    tracking.clear()
  }
}

export const watch = (getter: () => (() => void) | void) => {
  return new WatchEffect(getter)
}

export const useWatch = (getter: () => (() => void) | void) => {
  if (!sideEffectsEnabled()) return
  return useHook(
    "useWatch",
    { watcher: null as any as WatchEffect },
    ({ hook, isInit, vNode }) => {
      if (__DEV__) {
        if (vNode.hmrUpdated) {
          hook.cleanup?.()
          isInit = true
        }
      }
      if (isInit) {
        const watcher = (hook.watcher = new WatchEffect(getter))
        watcher.start()
        hook.cleanup = () => watcher.stop()
      }

      return hook.watcher
    }
  )
}
