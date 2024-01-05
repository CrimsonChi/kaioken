import { globalState as g } from "./globalState.js"

export { useState, useEffect, useReducer }

type StateSetter<T> = T | ((prev: T) => T)

function useState<T>(initial: T): [T, (value: StateSetter<T>) => void] {
  if (!g.mounted) return [initial, () => {}]
  const node = g.curNode
  if (!node) throw new Error("useState must be called in a component")
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
  if (!g.mounted) return
  const node = g.curNode
  if (!node) throw new Error("useEffect must be called in a component")

  const oldHook = node.prev && node.prev.hooks[g.hookIndex]

  if (oldHook?.cleanup) {
    oldHook.cleanup()
  }

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
  if (!g.mounted) return [initial, () => initial]
  const node = g.curNode
  if (!node) throw new Error("useState must be called in a component")
  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  const hook = oldHook ?? { state: initial }

  const dispatch = (action: A) => {
    hook.state = reducer(hook.state, action)
    g.setWipNode(node)
  }

  node.hooks[g.hookIndex++] = hook

  return [hook.state, dispatch]
}
