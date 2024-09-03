import { Hook, HookCallbackState, useHook } from "./utils.js"
import { __DEV__ } from "../env.js"
import { contextProviderSymbol } from "../constants.js"

type ContextProviderNode<T> = Kaioken.VNode & {
  type: typeof contextProviderSymbol
  props: { value: T; ctx: Kaioken.Context<T> }
}

type UseContextHook<T> = Hook<{
  ctxNode: ContextProviderNode<T> | undefined
  context: Kaioken.Context<T>
  warnIfNotFound: boolean
}>

export function useContext<T>(
  context: Kaioken.Context<T>,
  warnIfNotFound = true
): T {
  return useHook(
    "useContext",
    { ctxNode: undefined, context, warnIfNotFound },
    useContextCallback as typeof useContextCallback<T>
  )
}

const useContextCallback = <T>({
  hook,
  isInit,
  vNode,
}: HookCallbackState<UseContextHook<T>>) => {
  if (isInit) {
    if (__DEV__) {
      hook.debug = {
        get: () => ({
          contextName: hook.context.Provider.displayName || "",
          value: hook.ctxNode
            ? hook.ctxNode.props.value
            : hook.context.default(),
        }),
      }
    }

    let n = vNode.parent
    while (n) {
      if (n.type === contextProviderSymbol) {
        const ctxNode = n as ContextProviderNode<T>
        if (ctxNode.props.ctx === hook.context) {
          hook.ctxNode = ctxNode
          return hook.ctxNode.props.value
        }
      }
      n = n.parent
    }
  }
  if (!hook.ctxNode) {
    if (__DEV__) {
      hook.warnIfNotFound && warnProviderNotFound(hook.context)
    }
    return hook.context.default()
  }
  return hook.ctxNode.props.value
}

const contextsNotFound = new Set<Kaioken.Context<any>>()
function warnProviderNotFound(ctx: Kaioken.Context<any>) {
  if (!contextsNotFound.has(ctx)) {
    contextsNotFound.add(ctx)
    console.warn("[kaioken]: Unable to find context provider")
  }
}
