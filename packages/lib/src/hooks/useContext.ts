export function useContext<T>(context: Kaioken.Context<T>): T {
  return context.value()
}
