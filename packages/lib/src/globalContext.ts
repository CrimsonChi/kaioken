import type { AppContext } from "./appContext"

export { KaiokenGlobalContext, type GlobalKaiokenEvent }

type GlobalKaiokenEvent = "mount" | "unmount" | "update"

declare global {
  interface Window {
    __kaioken: KaiokenGlobalContext | undefined
  }
}

class KaiokenGlobalContext {
  listeners: Map<GlobalKaiokenEvent, Set<(ctx: AppContext) => void>> = new Map()

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
