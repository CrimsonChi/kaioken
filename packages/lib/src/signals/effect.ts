import { node } from "../globals.js"
import { sideEffectsEnabled } from "../utils.js"
import { tracking, effectQueue } from "./globals.js"

/**
 * Checks if a server render is in progress
 * @returns True if a server render is in progress
 */
export function isServerRender(): boolean {
  return !!node.current && !sideEffectsEnabled()
}

/**
 * Registers effect subscriptions for a given id
 * @param id - The id of the effect
 * @param subscriptions - The subscriptions map
 * @param callback - The callback to register
 */
export function registerEffectSubscriptions<T>(
  id: string,
  subscriptions: Map<string, Function>,
  callback: () => T
): void {
  for (const [id, unsub] of subscriptions) {
    if (tracking.signals.has(id)) continue
    unsub()
    subscriptions.delete(id)
  }

  const effect = () => {
    if (!effectQueue.has(id)) {
      queueMicrotask(() => effectQueue.get(id)?.())
    }
    effectQueue.set(id, callback)
  }

  for (const [id, sig] of tracking.signals) {
    if (subscriptions.has(id)) continue
    const unsub = sig.subscribe(effect)
    subscriptions.set(id, unsub)
  }
}

/**
 * Executes an effect function with dependency tracking enabled
 * @param fn - The effect function to execute
 * @returns The result of the effect function
 */
export function executeWithTracking<T>(fn: () => T): T {
  tracking.enabled = true
  const result = fn()
  tracking.enabled = false
  return result
}
