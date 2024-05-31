import type { AppContext } from "./appContext"
import { contexts } from "./globals.js"

export { KaiokenGlobalContext, type GlobalKaiokenEvent }

type GlobalKaiokenEvent = "mount" | "unmount" | "update"

class KaiokenGlobalContext {
  private listeners: Map<GlobalKaiokenEvent, Set<(ctx: AppContext) => void>> =
    new Map()
  get apps() {
    return contexts
  }
  emit(event: GlobalKaiokenEvent, ctx: AppContext) {
    this.listeners.get(event)?.forEach((cb) => cb(ctx))
  }
  on(event: GlobalKaiokenEvent, callback: (ctx: AppContext) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }
  off(event: GlobalKaiokenEvent, callback: (ctx: AppContext) => void) {
    if (!this.listeners.has(event)) {
      return
    }
    this.listeners.get(event)!.delete(callback)
  }
}
