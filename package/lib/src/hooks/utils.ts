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
  requestUpdate: typeof g.requestUpdate
  queueEffect: typeof g.queueEffect
}
type HookCallback<T, U> = (state: HookCallbackState<T>) => U

function useHook<T, U>(
  hookName: string,
  hookData: Hook<T>,
  callback: HookCallback<T, U>
): U {
  const node = g.curNode
  if (!node)
    throw new Error(
      `hook "${hookName}" must be used at the top level of a component or inside another hook.`
    )
  const oldHook = node.prev && node.prev.hooks[g.hookIndex]
  const hook = oldHook ?? hookData
  const res = callback({
    hook,
    oldHook,
    node,
    requestUpdate: g.requestUpdate.bind(g),
    queueEffect: g.queueEffect.bind(g),
  })
  node.hooks[g.hookIndex++] = hook
  return res
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
