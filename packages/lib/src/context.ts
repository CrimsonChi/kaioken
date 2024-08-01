import { contextDataSymbol } from "./constants.js"
import { fragment } from "./element.js"

export function createContext<T>(defaultValue: T): Kaioken.Context<T> {
  const ctx: Kaioken.Context<T> = {
    Provider: ({ value, children }: Kaioken.ProviderProps<T>) => {
      return fragment({
        children,
        [contextDataSymbol]: {
          value,
          ctx,
        },
      })
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
