import type { VNode } from "../types.js"
import { g } from "../globalState.js"

export {
  cleanupHook,
  depsRequireChange,
  useHook,
  type HookCallback,
  type HookCallbackState,
}

type Hook<T> = T & { cleanup?: () => void }
type HookCallbackState<T> = {
  hook: Hook<T>
  oldHook?: Hook<T>
  node: VNode
  requestUpdate: (node: VNode) => void
  queueEffect: (callback: () => void) => void
}
type HookCallback<T, U> = (state: HookCallbackState<T>) => U

function useHook<T, U>(
  hookName: string,
  hookData: Hook<T>,
  callback: (state: HookCallbackState<T>) => U
): U {
  const node = getCurrentNode(hookName)
  const { hook, oldHook } = getHook(node, hookData)
  const res = callback({
    hook,
    oldHook,
    node,
    requestUpdate: g.requestUpdate.bind(g),
    queueEffect: g.queueEffect.bind(g),
  })
  setHook(node, hook)
  return res
}

function getCurrentNode(hookName: string): VNode {
  if (!g.curNode)
    throw new Error(`${hookName} must be used at the top level of a component.`)
  return g.curNode
}

function getHook<T extends unknown>(
  node: VNode,
  fallback?: T
): {
  oldHook?: T & { cleanup?: () => void }
  hook: T & { cleanup?: () => void }
} {
  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  return {
    oldHook,
    hook: oldHook ?? fallback,
  }
}

function setHook<T extends unknown>(node: VNode, hook: T) {
  node.hooks[g.hookIndex++] = hook
}

function cleanupHook(hook: { cleanup?: () => void }) {
  if (hook.cleanup) {
    hook.cleanup()
    hook.cleanup = undefined
  }
}

function depsRequireChange(a?: unknown[], b?: unknown[]) {
  return (
    a === undefined ||
    b === undefined ||
    a.length !== b.length ||
    (a.length > 0 && b.some((dep, i) => dep !== a[i]))
  )
}
