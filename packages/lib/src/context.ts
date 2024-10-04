import { $CONTEXT_PROVIDER } from "./constants.js"
import { createElement } from "./element.js"

export function createContext<T>(defaultValue: T): Kaioken.Context<T> {
  const ctx: Kaioken.Context<T> = {
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
  return ctx
}
