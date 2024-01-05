import type { Context, ProviderProps } from "./types"
import { fragment } from "./index.js"

export { createContext }

function createContext<T>(initial: T | null): Context<T> {
  let context = initial as T

  return {
    Provider: ({ value, children = [] }: ProviderProps<T>) => {
      context = value
      return fragment({ children }) as JSX.Element
    },
    value: () => context,
  }
}
