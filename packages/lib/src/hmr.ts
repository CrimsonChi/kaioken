import type { Store } from "./store"
import { $HMR_ACCEPT } from "./constants.js"
import { __DEV__ } from "./env.js"
import { Signal } from "./signal.js"
import { traverseApply } from "./utils.js"

export type HMRAccept<T = {}> = {
  provide: () => T
  inject: (prev: T) => void
  destroy: () => void
}

export type GenericHMRAcceptor<T = {}> = {
  [$HMR_ACCEPT]: HMRAccept<T>
}

type HotVar = Kaioken.FC | Store<any, any> | Signal<any>

export function isGenericHmrAcceptor(
  thing: unknown
): thing is GenericHMRAcceptor<any> {
  return (
    !!thing &&
    (typeof thing === "object" || typeof thing === "function") &&
    $HMR_ACCEPT in thing &&
    typeof thing[$HMR_ACCEPT] === "object" &&
    !!thing[$HMR_ACCEPT]
  )
}

export function createHMRContext() {
  type FilePath = string
  type VarName = string
  const moduleMap = new Map<FilePath, Map<VarName, HotVar>>()

  const register = (filePath: string, hotVars: Record<string, HotVar>) => {
    if (__DEV__) {
      const mod = moduleMap.get(filePath)
      if (!mod) {
        moduleMap.set(filePath, new Map(Object.entries(hotVars)))
        return
      }
      for (const [name, newVal] of Object.entries(hotVars)) {
        const oldVal = mod.get(name)
        mod.set(name, newVal)
        if (!oldVal) continue
        if (isGenericHmrAcceptor(oldVal) && isGenericHmrAcceptor(newVal)) {
          newVal[$HMR_ACCEPT].inject(oldVal[$HMR_ACCEPT].provide())
          oldVal[$HMR_ACCEPT].destroy()
          continue
        }
        if (typeof oldVal === "function" && typeof newVal === "function") {
          window.__kaioken!.apps.forEach((ctx) => {
            if (!ctx.mounted || !ctx.rootNode) return
            traverseApply(ctx.rootNode, (vNode) => {
              if (vNode.type === oldVal) {
                vNode.type = newVal
                vNode.hmrUpdated = true
                if (vNode.prev) {
                  vNode.prev.type = newVal
                }
                ctx.requestUpdate(vNode)
              }
            })
          })
        }
      }
    }
  }

  return {
    register,
  }
}
