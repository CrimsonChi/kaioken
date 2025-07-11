import { node } from "../globals.js"
import { sideEffectsEnabled } from "../utils.js"
import { tracking, effectQueue } from "./globals.js"

export const isServerRender = (): boolean => {
  return !!node.current && !sideEffectsEnabled()
}

/**
 * Executes an effect function with dependency tracking enabled
 */
export const executeWithTracking = <T>(fn: () => T): T => {
  tracking.enabled = true
  const result = fn()
  tracking.enabled = false
  return result
}

/**
 * Cleans up old subscriptions that are no longer in the tracked signals
 */
export const cleanupStaleSubscriptions = (
  subscriptions: Map<string, Function>
): void => {
  for (const [id, unsub] of subscriptions) {
    if (tracking.signals.has(id)) continue
    unsub()
    subscriptions.delete(id)
  }
}

/**
 * Adds new tracked signals to the subscriptions map
 */
export const applyTrackedSignals = (
  subscriptions: Map<string, Function>,
  callback: () => void
): void => {
  for (const [id, sig] of tracking.signals) {
    if (subscriptions.has(id)) continue
    const unsub = sig.subscribe(callback)
    subscriptions.set(id, unsub)
  }
}

/**
 * Creates a microtask-scheduled effect callback
 */
export const createScheduledEffect = (
  effectId: string,
  effectFn: () => void
): (() => void) => {
  return () => {
    if (!effectQueue.has(effectId)) {
      queueMicrotask(() => effectQueue.get(effectId)?.())
    }
    effectQueue.set(effectId, effectFn)
  }
}
