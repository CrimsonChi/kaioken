import { ctx, nodeToCtxMap, node, renderMode } from "../globals.js"

export {
  cleanupHook,
  depsRequireChange,
  useHook,
  shouldExecHook,
  type HookCallback,
  type HookCallbackState,
}

const shouldExecHook = () => {
  return renderMode.current === "dom"
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

function useHook<T, U>(
  hookName: string,
  hookData: Hook<T>,
  callback: HookCallback<T, U>
): U {
  const vNode = node.current
  if (!vNode)
    throw new Error(
      `[kaioken]: hook "${hookName}" must be used at the top level of a component or inside another hook.`
    )
  const ctx = nodeToCtxMap.get(vNode)
  if (!ctx)
    throw new Error(
      `[kaioken]: an unknown error occured during execution of hook "${hookName}" (could not ascertain ctx). Seek help from the developers.`
    )
  const oldHook = vNode.prev && (vNode.prev.hooks?.at(ctx.hookIndex) as Hook<T>)
  const hook = oldHook ?? hookData
  if (!oldHook) hook.name = hookName
  else if (oldHook && oldHook.name !== hookName) {
    console.warn(
      `[kaioken]: hooks must be called in the same order. Hook "${hookName}" was called in place of "${oldHook.name}". Strange things may happen.`
    )
  }

  if (!vNode.hooks) vNode.hooks = []
  vNode.hooks[ctx.hookIndex++] = hook

  const res = callback({
    hook,
    oldHook,
    update: () => ctx.requestUpdate(vNode),
    queueEffect: ctx.queueEffect.bind(ctx),
    vNode,
  })
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
    (a.length > 0 && b.some((dep, i) => !Object.is(dep, a[i])))
  )
}
