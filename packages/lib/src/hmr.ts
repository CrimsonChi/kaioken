import type { Store } from "./store"
import { $HMR_ACCEPT } from "./constants.js"
import { __DEV__ } from "./env.js"
import { Signal } from "./signals/base.js"
import { traverseApply } from "./utils.js"
import type { WatchEffect } from "./signals/watch"
import { cleanupHook } from "./hooks"

export type HMRAccept<T = {}> = {
  provide: () => T
  inject: (prev: T) => void
  destroy: () => void
}

export type GenericHMRAcceptor<T = {}> = {
  [$HMR_ACCEPT]: HMRAccept<T>
}

type HotVarDesc =
  | {
      type: "component"
      value: Kaioken.FC
      hooks: Array<{ name: string; args: string }>
    }
  | {
      type: string
      value: Store<any, any> | Signal<any> | Kaioken.Context<any>
    }

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
  hotVars: Map<string, HotVarDesc>
  unnamedWatchers: Array<WatchEffect>
  fileLink: string
}

type HotVarRegistrationEntry = {
  type: string
  value: HotVarDesc
  hooks?: Array<{ name: string; args: string }>
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

  const register = (
    hotVarRegistrationEntries: Record<string, HotVarRegistrationEntry>
  ) => {
    if (currentModuleMemory === null)
      throw new Error("[kaioken]: HMR could not register: No active module")

    for (const [name, newEntry] of Object.entries(hotVarRegistrationEntries)) {
      const oldEntry = currentModuleMemory.hotVars.get(name)
      if (typeof newEntry.value === "function") {
        // @ts-ignore - this is how we tell devtools what file the component is from
        newEntry.value.__devtoolsFileLink = currentModuleMemory.fileLink + ":0"
        if (oldEntry?.value) {
          /**
           * this is how, when the previous function has been stored somewhere else (eg. by Vike),
           * we can trace it to its latest version
           */
          // @ts-ignore
          oldEntry.value.__next = newEntry.value
        }
      }
      currentModuleMemory.hotVars.set(name, newEntry as any)
      if (!oldEntry) continue
      if (
        isGenericHmrAcceptor(oldEntry.value) &&
        isGenericHmrAcceptor(newEntry.value)
      ) {
        newEntry.value[$HMR_ACCEPT].inject(
          oldEntry.value[$HMR_ACCEPT].provide()
        )
        oldEntry.value[$HMR_ACCEPT].destroy()
        continue
      }
      if (oldEntry.type === "component" && newEntry.type === "component") {
        const hooksToReset: number[] = []
        if ("hooks" in oldEntry && "hooks" in newEntry) {
          const hooks = newEntry.hooks!
          for (let i = 0; i < hooks.length; i++) {
            const hook = hooks[i]
            const oldHook = oldEntry.hooks[i]
            if (oldHook && hook.args === oldHook.args) {
              continue
            }
            hooksToReset.push(i)
          }
        }

        window.__kaioken!.apps.forEach((ctx) => {
          if (!ctx.mounted || !ctx.rootNode) return
          traverseApply(ctx.rootNode, (vNode) => {
            if (vNode.type === oldEntry.value) {
              vNode.type = newEntry.value as any
              vNode.hmrUpdated = true
              if (vNode.prev) {
                vNode.prev.type = newEntry.value as any
              }
              ctx.requestUpdate(vNode)
              if (!ctx.options?.useRuntimeHookInvalidation) {
                if (!vNode.hooks) return
                for (let i = 0; i < hooksToReset.length; i++) {
                  const hookIndex = hooksToReset[i]
                  cleanupHook(vNode.hooks[hookIndex])
                  // @ts-ignore
                  vNode.hooks[hookIndex] = undefined
                }
              }
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
