import { Hook, HookCallbackState, useHook } from "./utils.js"
import { contextDataSymbol } from "../constants.js"

type ContextNode<T> = Kaioken.VNode & {
  props: {
    [contextDataSymbol]: { value: T; ctx: Kaioken.Context<T> }
  }
}

type UseContextHook<T> = Hook<{
  ctxNode: ContextNode<T> | undefined
  context: Kaioken.Context<T>
}>

export function useContext<T>(context: Kaioken.Context<T>): T {
  return useHook(
    "useContext",
    { ctxNode: undefined, context },
    useContextCallback as typeof useContextCallback<T>
  )
}

const useContextCallback = <T>({
  hook,
  oldHook,
  vNode,
}: HookCallbackState<UseContextHook<T>>) => {
  if (!oldHook) {
    hook.debug = () => ({
      value: hook.ctxNode
        ? hook.ctxNode.props[contextDataSymbol].value
        : hook.context.default(),
    })

    let n = vNode.parent
    while (n) {
      if (contextDataSymbol in n.props) {
        const ctxNode = n as ContextNode<T>
        if (ctxNode.props[contextDataSymbol].ctx === hook.context) {
          hook.ctxNode = ctxNode
          return hook.ctxNode.props[contextDataSymbol].value
        }
      }
      n = n.parent
    }
  }
  if (!hook.ctxNode) {
    warnProviderNotFound(hook.context)
    return hook.context.default()
  }
  return hook.ctxNode.props[contextDataSymbol].value
}

const contextsNotFound = new Set<Kaioken.Context<any>>()
function warnProviderNotFound(ctx: Kaioken.Context<any>) {
  if (!contextsNotFound.has(ctx)) {
    contextsNotFound.add(ctx)
    console.warn("[kaioken]: Unable to find context provider")
  }
}
