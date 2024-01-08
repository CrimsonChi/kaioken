import { g } from "./globalState.js"
import type { Context, Ref } from "./types.js"

export { useState, useEffect, useReducer, useContext, useRef, useMemo }

type StateSetter<T> = T | ((prev: T) => T)

function useState<T>(initial: T): [T, (value: StateSetter<T>) => void] {
  const node = g.getCurrentNode("useState must be called in a component")
  if (!node) return [initial, () => {}]

  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  const hook = oldHook ?? { state: initial }

  const setState = (setter: StateSetter<T>) => {
    hook.state = setter instanceof Function ? setter(hook.state) : setter
    g.setWipNode(node)
  }

  node.hooks[g.hookIndex++] = hook
  return [hook.state, setState]
}

function useEffect(callback: Function, deps: any[] = []) {
  const node = g.getCurrentNode("useEffect must be called in a component")
  if (!node) return

  const oldHook = node.prev && node.prev.hooks[g.hookIndex]

  const hasChangedDeps =
    !oldHook ||
    deps.length === 0 ||
    (oldHook && !deps.every((dep, i) => dep === oldHook.deps[i]))

  const hook = {
    deps,
    callback,
    cleanup: undefined,
  }

  if (hasChangedDeps) {
    if (oldHook && oldHook.cleanup) {
      oldHook.cleanup()
      oldHook.cleanup = undefined
    }
    g.pendingEffects.push(() => {
      const cleanup = callback()
      if (cleanup && typeof cleanup === "function") {
        hook.cleanup = cleanup
      }
    })
  }

  node.hooks[g.hookIndex++] = hook
}

function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  initial: T
): [T, (action: A) => void] {
  const node = g.getCurrentNode("useReducer must be called in a component")
  if (!node) return [initial, () => initial]

  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  const hook = oldHook ?? { state: initial }

  const dispatch = (action: A) => {
    hook.state = reducer(hook.state, action)
    g.setWipNode(node)
  }

  node.hooks[g.hookIndex++] = hook

  return [hook.state, dispatch]
}

function useContext<T>(context: Context<T>): T {
  return context.value()
}

function useRef<T>(current: T | null): Ref<T> {
  const node = g.getCurrentNode("useRef must be called in a component")
  if (!node) return { current }

  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  const hook = oldHook ?? { current }

  node.hooks[g.hookIndex++] = hook
  return hook
}

function useMemo<T>(factory: () => T, deps: any[]): T {
  const node = g.getCurrentNode("useMemo must be called in a component")
  if (!node) return factory()
  const oldHook = node.prev && node.prev.hooks[g.hookIndex]

  const hook = oldHook ?? { deps, value: factory() }

  if (oldHook) {
    if (deps.length === 0 || !deps.every((dep, i) => dep === oldHook.deps[i])) {
      hook.value = factory()
    }
  }

  node.hooks[g.hookIndex++] = hook
  return hook.value
}
