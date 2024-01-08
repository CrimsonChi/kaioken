import type { VNode } from "../types.js"
import { g } from "../globalState.js"

export { getCurrentNode, getHook, setHook, cleanupHook }

function getCurrentNode(message: string): VNode | undefined {
  if (!g.mounted) return
  const node = g.curNode
  if (!node) throw new Error(message)
  return node
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
