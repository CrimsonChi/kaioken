import { ctx } from "../globalContext.js"

export const isSSR = !("window" in globalThis)

export {
  cleanupHook,
  depsRequireChange,
  useHook,
  type HookCallback,
  type HookCallbackState,
}

type Hook<T> = Kaioken.Hook<T>

type HookCallbackState<T> = {
  hook: Hook<T>
  oldHook?: Hook<T>
  update: () => void
  queueEffect: typeof ctx.queueEffect
}
type HookCallback<T, U> = (state: HookCallbackState<T>) => U

function useHook<T, U>(
  hookName: string,
  hookData: Hook<T>,
  callback: HookCallback<T, U>
): U {
  const node = ctx.curNode
  if (!node)
    throw new Error(
      `hook "${hookName}" must be used at the top level of a component or inside another hook.`
    )
  const oldHook = node.prev && (node.prev.hooks?.at(ctx.hookIndex) as Hook<T>)
  const hook = oldHook ?? hookData
  const res = callback({
    hook,
    oldHook,
    update: () => ctx.requestUpdate(node),
    queueEffect: ctx.queueEffect.bind(ctx),
  })
  if (!node.hooks) node.hooks = []
  node.hooks[ctx.hookIndex++] = hook
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
