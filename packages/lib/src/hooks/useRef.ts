import { isSSR, useHook } from "./utils.js"

export function useRef<T>(current: T | null): Kaioken.Ref<T> {
  if (isSSR) return { current }
  return useHook("useRef", { current }, ({ hook }) => hook)
}
