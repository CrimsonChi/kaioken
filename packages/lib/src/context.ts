export function createContext<T>(initial: T | null): Kaioken.Context<T> {
  let context = initial as T

  return {
    Provider: ({ value, children = [] }: Kaioken.ProviderProps<T>) => {
      context = value
      return children as JSX.Element
    },
    value: () => context,
  }
}
