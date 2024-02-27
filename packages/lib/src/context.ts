import { fragment } from "./index.js"

export function createContext<T>(initial: T | null): Kaioken.Context<T> {
  let context = initial as T

  return {
    Provider: ({ value, children = [] }: Kaioken.ProviderProps<T>) => {
      context = value
      return fragment({ children })
    },
    value: () => context,
  }
}
