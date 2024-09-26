import type { AppContext } from "./appContext"
import { __DEV__ } from "./env.js"
import { traverseApply } from "./utils.js"

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

  constructor() {
    this.on("mount", (ctx) => this.#contexts.add(ctx))
    this.on("unmount", (ctx) => this.#contexts.delete(ctx))
  }

  HMRContext = {
    register: (filePath: string, componentMap: Record<string, Kaioken.FC>) => {
      if (__DEV__) {
        const components = this.moduleMap.get(filePath)
        if (!components) {
          this.moduleMap.set(filePath, new Map(Object.entries(componentMap)))
          return
        }
        for (const [name, newFn] of Object.entries(componentMap)) {
          const oldFn = components.get(name)
          components.set(name, newFn)
          if (!oldFn) continue
          this.#contexts.forEach((ctx) => {
            if (!ctx.mounted || !ctx.rootNode) return
            traverseApply(ctx.rootNode, (node) => {
              if (node.type === oldFn) {
                node.type = newFn
                if (node.prev) {
                  node.prev.type = newFn
                }
                ctx.requestUpdate(node)
              }
            })
          })
        }
      }
    },
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

  private moduleMap = new Map<string, Map<string, Kaioken.FC>>()
}
