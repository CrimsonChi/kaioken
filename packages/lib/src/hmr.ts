import type { Store } from "./store"
import { $HMR_ACCEPT } from "./constants.js"
import { __DEV__ } from "./env.js"
import { Signal } from "./signals/base.js"
import { traverseApply } from "./utils.js"
import type { WatchEffect } from "./signals/watch"

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

type ModuleMemory = {
  hotVars: Map<string, HotVar>
  unnamedWatchers: Array<WatchEffect>
  fileLink: string
}

export function createHMRContext() {
  type FilePath = string
  const moduleMap = new Map<FilePath, ModuleMemory>()

  let currentModuleMemory: ModuleMemory | null = null
  let isModuleReplacementExecution = false
  const isReplacement = () => isModuleReplacementExecution
  let isWaitingForNextWatchCall = false
  let tmpUnnamedWatchers: WatchEffect[] = []

  const prepare = (filePath: string, fileLink: string) => {
    let mod = moduleMap.get(filePath)
    isModuleReplacementExecution = !!mod
    if (!mod) {
      mod = {
        hotVars: new Map(),
        unnamedWatchers: [],
        fileLink,
      }
      moduleMap.set(filePath, mod)
    }
    currentModuleMemory = mod!
  }

  const register = (hotVars: Record<string, HotVar>) => {
    if (currentModuleMemory === null)
      throw new Error("[kaioken]: HMR could not register: No active module")

    for (const [name, newVar] of Object.entries(hotVars)) {
      const oldVar = currentModuleMemory.hotVars.get(name)
      // @ts-ignore
      newVar.__devtoolsFileLink = currentModuleMemory.fileLink + ":0"
      currentModuleMemory.hotVars.set(name, newVar)
      if (!oldVar) continue
      if (isGenericHmrAcceptor(oldVar) && isGenericHmrAcceptor(newVar)) {
        newVar[$HMR_ACCEPT].inject(oldVar[$HMR_ACCEPT].provide())
        oldVar[$HMR_ACCEPT].destroy()
        continue
      }
      if (typeof oldVar === "function" && typeof newVar === "function") {
        window.__kaioken!.apps.forEach((ctx) => {
          if (!ctx.mounted || !ctx.rootNode) return
          traverseApply(ctx.rootNode, (vNode) => {
            if (vNode.type === oldVar) {
              vNode.type = newVar
              vNode.hmrUpdated = true
              if (vNode.prev) {
                vNode.prev.type = newVar
              }
              ctx.requestUpdate(vNode)
            }
          })
        })
      }
    }
    isModuleReplacementExecution = false

    if (tmpUnnamedWatchers.length) {
      let i = 0
      for (; i < tmpUnnamedWatchers.length; i++) {
        const newWatcher = tmpUnnamedWatchers[i]
        const oldWatcher = currentModuleMemory.unnamedWatchers[i]
        if (oldWatcher) {
          newWatcher[$HMR_ACCEPT]!.inject(oldWatcher[$HMR_ACCEPT]!.provide())
          oldWatcher[$HMR_ACCEPT]!.destroy()
        }
        currentModuleMemory.unnamedWatchers[i] = newWatcher
      }
      for (; i < currentModuleMemory.unnamedWatchers.length; i++) {
        const oldWatcher = currentModuleMemory.unnamedWatchers[i]
        oldWatcher[$HMR_ACCEPT]!.destroy()
      }
      currentModuleMemory.unnamedWatchers.length = tmpUnnamedWatchers.length
      tmpUnnamedWatchers.length = 0
    }
  }

  const signals = {
    registerNextWatch() {
      isWaitingForNextWatchCall = true
    },
    isWaitingForNextWatchCall() {
      return isWaitingForNextWatchCall
    },
    pushWatch(watch: WatchEffect) {
      tmpUnnamedWatchers.push(watch)
      isWaitingForNextWatchCall = false
    },
  }

  return {
    register,
    prepare,
    isReplacement,
    signals,
  }
}
