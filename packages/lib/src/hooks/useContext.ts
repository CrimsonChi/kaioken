import type { Context } from "../types"

export function useContext<T>(context: Context<T>): T {
  return context.value()
}
