import type { AppContext } from "./appContext"
import type { Store } from "./store"
import { $HMR_ACCEPTOR } from "./constants.js"
import { __DEV__ } from "./env.js"
import { isGenericHmrAcceptor } from "./hmr.js"
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

type HotVar = Kaioken.FC | Store<any, any>

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
    register: (filePath: string, hotVars: Record<string, HotVar>) => {
      if (__DEV__) {
        const mod = this.moduleMap.get(filePath)
        if (!mod) {
          this.moduleMap.set(filePath, new Map(Object.entries(hotVars)))
          return
        }
        for (const [name, newVal] of Object.entries(hotVars)) {
          const oldVal = mod.get(name)
          mod.set(name, newVal)
          if (!oldVal) continue
          if (isGenericHmrAcceptor(oldVal) && isGenericHmrAcceptor(newVal)) {
            newVal[$HMR_ACCEPTOR].inject(oldVal[$HMR_ACCEPTOR].provide())
            oldVal[$HMR_ACCEPTOR].destroy()
            continue
          }
          this.#contexts.forEach((ctx) => {
            if (!ctx.mounted || !ctx.rootNode) return
            traverseApply(ctx.rootNode, (vNode) => {
              if (vNode.type === oldVal) {
                vNode.type = newVal
                if (vNode.prev) {
                  vNode.prev.type = newVal
                }
                ctx.requestUpdate(vNode)
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

  private moduleMap = new Map<string, Map<string, HotVar>>()
}
