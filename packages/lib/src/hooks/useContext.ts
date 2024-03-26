import { useHook } from "./utils"

const contextDataSymbol = Symbol.for("kaioken.contextData")

type ContextNode<T> = Kaioken.VNode & {
  props: {
    [contextDataSymbol]: { value: T; ctx: Kaioken.Context<T> }
  }
}

export function useContext<T>(context: Kaioken.Context<T>): T {
  return useHook(
    "useContext",
    {
      ctxNode: undefined as ContextNode<T> | undefined,
    },
    ({ hook, oldHook, vNode }) => {
      if (oldHook) {
        if (!oldHook.ctxNode) {
          warnProviderNotFound()
          return context.default() as T
        }
        return oldHook.ctxNode.props[contextDataSymbol].value
      }

      let n = vNode.parent
      while (n) {
        if (contextDataSymbol in n.props) {
          const ctxNodeData = n.props[
            contextDataSymbol
          ] as ContextNode<T>["props"]
          if (ctxNodeData.ctx === context) {
            hook.ctxNode = n as ContextNode<T>
            return (n.props[contextDataSymbol] as ContextNode<T>["props"]).value
          }
        }
        n = n.parent
      }

      warnProviderNotFound()
      return context.default() as T
    }
  )
}

let hasWarned = false
function warnProviderNotFound() {
  if (!hasWarned) {
    console.warn(
      `[kaioken]: Unable to find context in parent nodes. Did you forget to use the context provider?`,
      new Error()
    )
    hasWarned = true
  }
}
