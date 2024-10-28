import { $CONTEXT, $CONTEXT_PROVIDER, $HMR_ACCEPT } from "./constants.js"
import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"
import { GenericHMRAcceptor } from "./hmr.js"
import { traverseApply } from "./utils.js"

export function createContext<T>(defaultValue: T): Kaioken.Context<T> {
  const ctx: Kaioken.Context<T> = {
    [$CONTEXT]: true,
    Provider: ({ value, children }: Kaioken.ProviderProps<T>) => {
      return createElement(
        $CONTEXT_PROVIDER,
        { value, ctx },
        typeof children === "function" ? children(value) : children
      )
    },
    default: () => defaultValue,
    set displayName(name: string) {
      this.Provider.displayName = name
    },
    get displayName() {
      return this.Provider.displayName || "Anonymous Context"
    },
  }
  if (__DEV__) {
    const asHmrAcceptor = ctx as any as GenericHMRAcceptor<Kaioken.Context<T>>
    asHmrAcceptor[$HMR_ACCEPT] = {
      inject: (prev) => {
        const newProvider = ctx.Provider
        window.__kaioken!.apps.forEach((ctx) => {
          if (!ctx.mounted || !ctx.rootNode) return
          traverseApply(ctx.rootNode, (vNode) => {
            if (vNode.type === prev.Provider) {
              vNode.type = newProvider
              vNode.hmrUpdated = true
              if (vNode.prev) {
                vNode.prev.type = newProvider
              }
              ctx.requestUpdate(vNode)
            }
          })
        })
      },
      destroy: () => {},
      provide: () => ctx,
    }
  }

  return ctx
}

export function isContext<T>(thing: unknown): thing is Kaioken.Context<T> {
  return typeof thing === "object" && !!thing && $CONTEXT in thing
}
