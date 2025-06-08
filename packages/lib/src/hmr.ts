import type { Store } from "./store"
import type { WatchEffect } from "./signals/watch"
import { $HMR_ACCEPT } from "./constants.js"
import { __DEV__ } from "./env.js"
import { Signal } from "./signals/base.js"
import { traverseApply } from "./utils.js"
import { HMR_INVALIDATE_HOOK_SENTINEL_INTERNAL_USE_ONLY } from "./hooks/utils.js"
import type { AppContext } from "./appContext"

export type HMRAccept<T = {}> = {
  provide: () => T
  inject: (prev: T) => void
  destroy: () => void
}

export type GenericHMRAcceptor<T = {}> = {
  [$HMR_ACCEPT]: HMRAccept<T>
}
type HotVar = Kaioken.FC | Store<any, any> | Signal<any> | Kaioken.Context<any>

type HotVarDesc = {
  type: string
  value: HotVar
  hooks?: Array<{ name: string; args: string }>
  link: string
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
}

type HotVarRegistrationEntry = {
  type: string
  value: HotVar
  hooks?: Array<{ name: string; args: string }>
  link: string
}

export function createHMRContext() {
  type FilePath = string
  const moduleMap = new Map<FilePath, ModuleMemory>()
  let currentModuleMemory: ModuleMemory | null = null
  let isModuleReplacementExecution = false
  const isReplacement = () => isModuleReplacementExecution
  let isWaitingForNextWatchCall = false
  let tmpUnnamedWatchers: WatchEffect[] = []

  const onHmrCallbacks: Array<() => void> = []
  const onHmr = (callback: () => void) => {
    onHmrCallbacks.push(callback)
  }

  const prepare = (filePath: string) => {
    let mod = moduleMap.get(filePath)
    isModuleReplacementExecution = !!mod
    if (!mod) {
      mod = {
        hotVars: new Map(),
        unnamedWatchers: [],
      }
      moduleMap.set(filePath, mod)
    } else {
      while (onHmrCallbacks.length) onHmrCallbacks.shift()!()
    }
    currentModuleMemory = mod!
  }

  const register = (
    hotVarRegistrationEntries: Record<string, HotVarRegistrationEntry>
  ) => {
    if (currentModuleMemory === null)
      throw new Error("[kaioken]: HMR could not register: No active module")

    let dirtiedApps: Set<AppContext> = new Set()
    for (const [name, newEntry] of Object.entries(hotVarRegistrationEntries)) {
      const oldEntry = currentModuleMemory.hotVars.get(name)

      // @ts-ignore - this is how we tell devtools what file the hotvar is from
      newEntry.value.__devtoolsFileLink = newEntry.link

      if (typeof newEntry.value === "function") {
        if (oldEntry?.value) {
          /**
           * this is how, when the previous function has been stored somewhere else (eg. in a Map, or by Vike),
           * we can trace it to its latest version
           */
          // @ts-ignore
          oldEntry.value.__next = newEntry.value
        }
      }

      if (newEntry.type === "createStore") {
        window.__kaioken!.stores.add(name, newEntry.value as Store<any, any>)
      }

      currentModuleMemory.hotVars.set(name, newEntry)
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
        let maxHookLen: number | null = null
        if ("hooks" in oldEntry && "hooks" in newEntry) {
          const newHooks = newEntry.hooks!
          const oldHooks = oldEntry.hooks ?? []

          for (let i = 0; i < oldHooks.length; i++) {
            const oldHook = oldHooks[i]
            const newHook = newHooks[i]
            if (!newHook || newHook.name !== oldHook.name) {
              /**
               * if either:
               * - hook was removed
               * or:
               * - new hook inserted before old hook
               * then:
               * invalidate all remaining hooks from this point
               */
              maxHookLen = i
              break
            }
            if (newHook.args !== oldHook.args) {
              hooksToReset.push(i)
            }
          }
        }

        window.__kaioken!.apps.forEach((ctx) => {
          if (!ctx.mounted || !ctx.rootNode) return
          traverseApply(ctx.rootNode, (vNode) => {
            if (vNode.type === oldEntry.value) {
              vNode.type = newEntry.value as any
              dirtiedApps.add(ctx)
              vNode.hmrUpdated = true
              if (vNode.prev) {
                vNode.prev.type = newEntry.value as any
              }
              if (!vNode.hooks) return
              if (maxHookLen !== null) {
                for (let i = maxHookLen; i < vNode.hooks.length; i++) {
                  vNode.hooks[i].cleanup?.()
                }
                vNode.hooks.length = maxHookLen
              }
              for (let i = 0; i < hooksToReset.length; i++) {
                const hook = vNode.hooks[hooksToReset[i]]
                if (hook.dev?.onRawArgsChanged === "persist") {
                  // @ts-ignore
                  hook.dev.rawArgsChanged = true
                } else {
                  hook.cleanup?.()
                  // replace it with our 'invalidate' sentinel. This will cause `useHook` to recreate the hookState from scratch.
                  vNode.hooks[hooksToReset[i]] =
                    HMR_INVALIDATE_HOOK_SENTINEL_INTERNAL_USE_ONLY
                }
              }
            }
          })
        })
      }
    }
    dirtiedApps.forEach((ctx) => ctx.requestUpdate())
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
    onHmr,
  }
}
