import { KaiokenError } from "../error.js"
import { __DEV__ } from "../env.js"
import { node, nodeToCtxMap } from "../globals.js"
import { getVNodeAppContext, noop, safeStringify } from "../utils.js"
export { sideEffectsEnabled } from "../utils.js"
export {
  cleanupHook,
  depsRequireChange,
  useHook,
  useVNode,
  useAppContext,
  useHookDebugGroup,
  useHookHMRInvalidation,
  useRequestUpdate,
  HookDebugGroupAction,
  type Hook,
  type HookCallback,
  type HookCallbackState,
}

type DevHook<T> = Hook<T> & {
  devInvalidationValue?: string
}

let nextHookDevInvalidationValue: string | undefined
const useHookHMRInvalidation = (...values: unknown[]) => {
  if (__DEV__) {
    nextHookDevInvalidationValue = safeStringify(values)
  }
}

enum HookDebugGroupAction {
  Start = "start",
  End = "end",
}

const useHookDebugGroup = (name: string, action: HookDebugGroupAction) => {
  if (__DEV__) {
    return useHook(
      "devtools:useHookDebugGroup",
      { displayName: name, action },
      noop
    )
  }
}

/**
 * Used obtain an 'requestUpdate' function for the current component.
 */
const useRequestUpdate = () => {
  const n = node.current
  if (!n) error_hookMustBeCalledTopLevel("useRequestUpdate")
  const ctx = getVNodeAppContext(n)
  return () => ctx.requestUpdate(n)
}

/**
 * Used to obtain the 'AppContext' for the current component.
 */
const useAppContext = () => {
  if (!node.current) error_hookMustBeCalledTopLevel("useAppContext")
  const ctx = nodeToCtxMap.get(node.current)
  if (!ctx)
    error_hookMustBeCalledTopLevel(
      "[kaioken]: unable to find node's AppContext"
    )
  return ctx
}

/**
 * Used to obtain the 'VNode' for the current component.
 */
const useVNode = () => {
  const n = node.current
  if (!n) error_hookMustBeCalledTopLevel("useVNode")
  return n
}

type Hook<T> = Kaioken.Hook<T>

type HookCallbackState<T> = {
  hook: Hook<T>
  isInit: boolean
  update: () => void
  queueEffect: (callback: Function, opts?: { immediate?: boolean }) => void
  vNode: Kaioken.VNode
}
type HookCallback<T> = (state: HookCallbackState<T>) => any

let currentHookName: string | null = null
const nestedHookWarnings = new Set<string>()

function useHook<
  T extends () => Record<string, unknown>,
  U extends HookCallback<ReturnType<T>>,
>(hookName: string, hookInitializer: T, callback: U): ReturnType<U>

function useHook<T extends Record<string, unknown>, U extends HookCallback<T>>(
  hookName: string,
  hookData: T,
  callback: U
): ReturnType<U>

function useHook<
  T,
  U extends T extends () => Record<string, unknown>
    ? HookCallback<ReturnType<T>>
    : HookCallback<T>,
>(
  hookName: string,
  hookDataOrInitializer: Kaioken.Hook<T> | (() => Kaioken.Hook<T>),
  callback: U
): ReturnType<U> {
  const vNode = node.current
  if (!vNode) error_hookMustBeCalledTopLevel(hookName)

  if (
    currentHookName !== null &&
    !nestedHookWarnings.has(hookName + currentHookName)
  ) {
    nestedHookWarnings.add(hookName + currentHookName)
    throw new KaiokenError({
      message: `Nested primitive "useHook" calls are not supported. "${hookName}" was called inside "${currentHookName}". Strange will most certainly happen.`,
      vNode: node.current,
    })
  }

  const ctx = getVNodeAppContext(vNode)
  const oldHook = (
    vNode.prev
      ? vNode.prev.hooks?.at(ctx.hookIndex)
      : vNode.hooks?.at(ctx.hookIndex)
  ) as Hook<T> | undefined
  const hook =
    oldHook ??
    (typeof hookDataOrInitializer === "function"
      ? hookDataOrInitializer()
      : { ...hookDataOrInitializer })

  if (!oldHook) hook.name = hookName
  else if (oldHook.name !== hookName) {
    console.warn(
      `[kaioken]: hooks must be called in the same order. Hook "${hookName}" was called in place of "${oldHook.name}". Strange things may happen.`
    )
  }
  currentHookName = hookName
  if (!vNode.hooks) vNode.hooks = []
  vNode.hooks[ctx.hookIndex++] = hook

  if (__DEV__) {
    const oldAsDevHook = oldHook as DevHook<T> | undefined
    const asDevHook = hook as DevHook<T>
    let hmrInvalid = false
    if (nextHookDevInvalidationValue !== undefined) {
      if (!oldAsDevHook) {
        asDevHook.devInvalidationValue = nextHookDevInvalidationValue // store our initial 'devInvalidationValue'
      } else if (
        vNode.hmrUpdated &&
        (oldAsDevHook.devInvalidationValue !== nextHookDevInvalidationValue ||
          // handle cases where we just call 'useHookHMRInvalidation()', like `watch`
          (oldAsDevHook.devInvalidationValue === "[]" &&
            nextHookDevInvalidationValue === "[]"))
      ) {
        hmrInvalid = true
        asDevHook.devInvalidationValue = nextHookDevInvalidationValue
      }
    }

    try {
      const res = (callback as HookCallback<T>)({
        hook: hook,
        isInit: !oldHook || hmrInvalid,
        update: () => ctx.requestUpdate(vNode),
        queueEffect: (callback: Function, opts?: { immediate?: boolean }) => {
          if (opts?.immediate) {
            return ctx.queueImmediateEffect(vNode, callback)
          }
          ctx.queueEffect(vNode, callback)
        },
        vNode,
      })
      return res
    } catch (error) {
      throw error
    } finally {
      currentHookName = null
      nextHookDevInvalidationValue = undefined
    }
  }

  try {
    const res = (callback as HookCallback<T>)({
      hook: hook,
      isInit: !oldHook,
      update: () => ctx.requestUpdate(vNode),
      queueEffect: (callback: Function, opts?: { immediate?: boolean }) => {
        if (opts?.immediate) {
          return ctx.queueImmediateEffect(vNode, callback)
        }
        ctx.queueEffect(vNode, callback)
      },
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
  throw new KaiokenError(
    `Hook "${hookName}" must be used at the top level of a component or inside another composite hook.`
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
