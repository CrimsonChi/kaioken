import { ctx, node, renderMode } from "../globals.js"

export {
  cleanupHook,
  depsRequireChange,
  useHook,
  shouldExecHook,
  useCurrentNode,
  type HookCallback,
  type HookCallbackState,
}

const useCurrentNode = () => {
  const n = node.current
  if (!n) error_hookMustBeCalledTopLevel("useCurrentNode")
  return n
}

const shouldExecHook = () => {
  return renderMode.current === "dom" || renderMode.current === "hydrate"
}

type Hook<T> = Kaioken.Hook<T>

type HookCallbackState<T> = {
  hook: Hook<T>
  oldHook?: Hook<T>
  update: () => void
  queueEffect: typeof ctx.current.queueEffect
  vNode: Kaioken.VNode
}
type HookCallback<T, U> = (state: HookCallbackState<T>) => U

let currentHookName: string | null = null

function useHook<T, U>(
  hookName: string,
  hookData: Hook<T>,
  callback: HookCallback<T, U>
): U {
  if (currentHookName !== null) {
    throw new Error(
      `[kaioken]: nested primitive 'useHook' calls are not supported. "${hookName}" was called inside "${currentHookName}".`
    )
  }
  const vNode = node.current
  if (!vNode) error_hookMustBeCalledTopLevel(hookName)
  const ctx = vNode.ctx
  const oldHook = vNode.prev && (vNode.prev.hooks?.at(ctx.hookIndex) as Hook<T>)
  const hook = oldHook ?? hookData

  if (!oldHook) hook.name = hookName
  else if (oldHook.name !== hookName) {
    console.warn(
      `[kaioken]: hooks must be called in the same order. Hook "${hookName}" was called in place of "${oldHook.name}". Strange things may happen.`
    )
  }

  currentHookName = hookName

  if (!vNode.hooks) vNode.hooks = []
  vNode.hooks[ctx.hookIndex++] = hook

  const res = callback({
    hook,
    oldHook,
    update: () => ctx.requestUpdate(vNode),
    queueEffect: ctx.queueEffect.bind(ctx),
    vNode,
  })

  currentHookName = null
  return res
}

function error_hookMustBeCalledTopLevel(hookName: string): never {
  throw new Error(
    `[kaioken]: hook "${hookName}" must be used at the top level of a component or inside another composite hook.`
  )
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
    (a.length > 0 && b.some((dep, i) => !Object.is(dep, a[i])))
  )
}
