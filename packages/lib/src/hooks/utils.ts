import { warnDeprecated } from "../warning.js"
import { ctx, node, renderMode } from "../globals.js"
export { sideEffectsEnabled } from "../utils.js"
export {
  cleanupHook,
  depsRequireChange,
  useHook,
  shouldExecHook,
  useCurrentNode,
  type Hook,
  type HookCallback,
  type HookCallbackState,
}

const useCurrentNode = () => {
  const n = node.current
  if (!n) error_hookMustBeCalledTopLevel("useCurrentNode")
  return n
}

let hasWarnedShouldExecHook = false
const shouldExecHook = () => {
  if (!hasWarnedShouldExecHook) {
    hasWarnedShouldExecHook = true
    warnDeprecated(
      "shouldExecHook()",
      "due to ambiguity",
      "Use sideEffectsEnabled() instead"
    )
  }
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
type HookCallback<T> = (state: HookCallbackState<T>) => any

let currentHookName: string | null = null
const nestedHookWarnings = new Set<string>()

function useHook<T, U extends HookCallback<T>>(
  hookName: string,
  hookDataOrInitializer: (() => Hook<T>) | Hook<T>,
  callback: U
): ReturnType<U> {
  if (
    currentHookName !== null &&
    !nestedHookWarnings.has(hookName + currentHookName)
  ) {
    nestedHookWarnings.add(hookName + currentHookName)
    throw new Error(
      `[kaioken]: nested primitive "useHook" calls are not supported. "${hookName}" was called inside "${currentHookName}". Strange things may happen.`
    )
  }
  const vNode = node.current
  if (!vNode) error_hookMustBeCalledTopLevel(hookName)
  const ctx = vNode.ctx
  const oldHook = vNode.prev && (vNode.prev.hooks?.at(ctx.hookIndex) as Hook<T>)
  const hook =
    oldHook ??
    (typeof hookDataOrInitializer === "function"
      ? hookDataOrInitializer()
      : hookDataOrInitializer)

  if (!oldHook) hook.name = hookName
  else if (oldHook.name !== hookName) {
    console.warn(
      `[kaioken]: hooks must be called in the same order. Hook "${hookName}" was called in place of "${oldHook.name}". Strange things may happen.`
    )
  }

  currentHookName = hookName

  if (!vNode.hooks) vNode.hooks = []
  vNode.hooks[ctx.hookIndex++] = hook
  try {
    const res = callback({
      hook,
      oldHook,
      update: () => ctx.requestUpdate(vNode),
      queueEffect: ctx.queueEffect.bind(ctx),
      vNode,
    })
    return res
  } catch (error) {
    throw error
  } finally {
    currentHookName = null
  }
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
