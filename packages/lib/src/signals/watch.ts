import { __DEV__ } from "../env.js"
import type { HMRAccept } from "../hmr.js"
import { $HMR_ACCEPT } from "../constants.js"
import { sideEffectsEnabled, useHook } from "../hooks/utils.js"
import { effectQueue, tracking } from "./globals.js"
import { generateRandomID } from "../generateId.js"
import {
  executeWithTracking,
  isServerRender,
  registerEffectSubscriptions,
} from "./effect.js"
import { latest } from "../utils.js"
import type { Signal } from "./base.js"
import type { SignalValues } from "./types.js"

type WatchCallbackReturn = (() => void) | void

export class WatchEffect<const TDeps extends readonly Signal<unknown>[] = []> {
  protected id: string
  protected getter: (...values: SignalValues<TDeps>) => WatchCallbackReturn
  protected dependencies?: TDeps
  protected unsubs: Map<string, Function>
  protected cleanup: (() => void) | null
  protected isRunning?: boolean
  protected [$HMR_ACCEPT]?: HMRAccept<WatchEffect<TDeps>>

  constructor(
    getter: (...values: SignalValues<TDeps>) => WatchCallbackReturn,
    dependencies?: TDeps
  ) {
    this.id = generateRandomID()
    this.getter = getter
    this.dependencies = dependencies
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
          signals.pushWatch(this as WatchEffect)
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

  static run(watchEffect: WatchEffect<any>) {
    const effect = latest(watchEffect)
    const { id, getter, unsubs, dependencies } = effect

    effectQueue.delete(id)
    effect.cleanup = executeWithTracking(getter, dependencies ?? []) ?? null

    if (isServerRender()) {
      return tracking.clear()
    }
    registerEffectSubscriptions(id, unsubs, () => {
      effect.cleanup?.()
      WatchEffect.run(effect)
    })
    tracking.clear()
  }
}

export function watch(getter: () => WatchCallbackReturn): WatchEffect
export function watch<const TDeps extends readonly Signal<unknown>[]>(
  dependencies: TDeps,
  getter: (...values: SignalValues<TDeps>) => WatchCallbackReturn
): WatchEffect<TDeps>
export function watch<const TDeps extends readonly Signal<unknown>[]>(
  depsOrGetter: TDeps | (() => WatchCallbackReturn),
  getter?: (...values: SignalValues<TDeps>) => WatchCallbackReturn
): WatchEffect<TDeps> | WatchEffect {
  if (typeof depsOrGetter === "function") {
    return new WatchEffect<[]>(depsOrGetter)
  }
  const dependencies = depsOrGetter
  const effectGetter = getter!
  return new WatchEffect(effectGetter, dependencies)
}

export function useWatch(getter: () => WatchCallbackReturn): WatchEffect
export function useWatch<const TDeps extends readonly Signal<unknown>[]>(
  dependencies: TDeps,
  getter: (...values: SignalValues<TDeps>) => WatchCallbackReturn
): WatchEffect<TDeps> | undefined

export function useWatch<const TDeps extends readonly Signal<unknown>[]>(
  depsOrGetter: TDeps | (() => WatchCallbackReturn),
  getter?: (...values: SignalValues<TDeps>) => WatchCallbackReturn
): WatchEffect<TDeps> | WatchEffect | undefined {
  if (!sideEffectsEnabled()) return

  return useHook(
    "useWatch",
    { watcher: null as any as WatchEffect<TDeps> },
    ({ hook, isInit, vNode }) => {
      if (__DEV__) {
        if (vNode.hmrUpdated) {
          hook.cleanup?.()
          isInit = true
        }
      }
      if (isInit) {
        const watcher = (hook.watcher = watch(depsOrGetter as TDeps, getter!))
        hook.cleanup = () => watcher.stop()
      }

      return hook.watcher
    }
  )
}
