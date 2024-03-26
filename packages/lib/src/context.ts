import { fragment } from "./index.js"

const contextDataSymbol = Symbol.for("kaioken.contextData")

export function createContext<T>(defaultValue: T): Kaioken.Context<T> {
  const ctx = {
    Provider: ({ value, children = [] }: Kaioken.ProviderProps<T>) => {
      return fragment({
        children,
        [contextDataSymbol]: {
          value,
          ctx,
        },
      })
    },
    default: () => defaultValue,
  }
  return ctx
}
