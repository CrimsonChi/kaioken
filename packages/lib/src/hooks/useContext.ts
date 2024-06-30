import { useHook } from "./utils.js"
import { contextDataSymbol } from "../constants.js"

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
      if (!oldHook) {
        hook.debug = () => ({
          value: hook.ctxNode
            ? hook.ctxNode.props[contextDataSymbol].value
            : context.default(),
        })

        let n = vNode.parent
        while (n) {
          if (contextDataSymbol in n.props) {
            const ctxNode = n as ContextNode<T>
            if (ctxNode.props[contextDataSymbol].ctx === context) {
              hook.ctxNode = ctxNode
              return hook.ctxNode.props[contextDataSymbol].value
            }
          }
          n = n.parent
        }
      }
      if (!hook.ctxNode) {
        warnProviderNotFound()
        return context.default() as T
      }
      return hook.ctxNode.props[contextDataSymbol].value
    }
  )
}

let hasWarned = false
function warnProviderNotFound() {
  if (!hasWarned) {
    console.warn(`[kaioken]: Unable to find context provider`, new Error())
    hasWarned = true
  }
}
