import { shouldExecHook, useHook } from "./utils.js"

export function useRef<T>(current: T | null): Kaioken.Ref<T> {
  if (!shouldExecHook()) return { current }
  return useHook("useRef", { current }, ({ hook }) => hook)
}
