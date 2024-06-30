import { contextDataSymbol } from "./constants.js"
import { fragment } from "./index.js"

export function createContext<T>(defaultValue: T): Kaioken.Context<T> {
  const ctx = {
    Provider: ({ value, children = [] }: Kaioken.ProviderProps<T>) => {
      return fragment({
        children: children as JSX.Element[],
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
