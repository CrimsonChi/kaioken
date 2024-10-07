import type { AppContext } from "./appContext"
import { __DEV__ } from "./env.js"
import { createHMRContext } from "./hmr.js"

export { KaiokenGlobalContext, type GlobalKaiokenEvent }

type Evt =
  | {
      name: "mount"
      data?: undefined
    }
  | {
      name: "unmount"
      data?: undefined
    }
  | {
      name: "update"
      data?: undefined
    }
  | {
      name: "error"
      data: Error
    }

type GlobalKaiokenEvent = Evt["name"]

class KaiokenGlobalContext {
  #contexts: Set<AppContext> = new Set()
  private listeners: Map<
    GlobalKaiokenEvent,
    Set<(ctx: AppContext, data?: Evt["data"]) => void>
  > = new Map()
  HMRContext?: ReturnType<typeof createHMRContext>

  constructor() {
    this.on("mount", (ctx) => this.#contexts.add(ctx))
    this.on("unmount", (ctx) => this.#contexts.delete(ctx))
    if (__DEV__) {
      this.HMRContext = createHMRContext()
    }
  }

  get apps() {
    return Array.from(this.#contexts)
  }
  emit<T extends Evt>(event: T["name"], ctx: AppContext, data?: T["data"]) {
    this.listeners.get(event)?.forEach((cb) => cb(ctx, data))
  }
  on<T extends Evt>(
    event: T["name"],
    callback: (ctx: AppContext, data: T["data"]) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }
  off<T extends Evt>(
    event: T["name"],
    callback: (ctx: AppContext, data?: T["data"]) => void
  ) {
    if (!this.listeners.has(event)) {
      return
    }
    this.listeners.get(event)!.delete(callback)
  }
}
