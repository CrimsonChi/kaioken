import type { VNode } from "../types.js"
import { g } from "../globalState.js"

export { getCurrentNode, getHook, setHook, cleanupHook, arrayChanged }

function getCurrentNode(hookName: string): VNode | undefined {
  if (!g.curNode)
    throw new Error(`${hookName} must be used at the top level of a component.`)
  return g.curNode
}

function getHook<T extends unknown>(
  node: VNode,
  fallback?: T
): { oldHook?: T; hook: T } {
  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  return {
    oldHook,
    hook: oldHook ?? fallback,
  }
}

function setHook<T extends unknown>(node: VNode, hook: T) {
  node.hooks[g.hookIndex++] = hook
}

function cleanupHook(hook: any) {
  if (hook.cleanup) {
    hook.cleanup()
    hook.cleanup = undefined
  }
}

function arrayChanged(oldItems: any[] = [], newItems: any[]) {
  return (
    newItems.length === 0 ||
    oldItems.length !== newItems.length ||
    newItems.some((dep, i) => dep !== oldItems[i])
  )
}
