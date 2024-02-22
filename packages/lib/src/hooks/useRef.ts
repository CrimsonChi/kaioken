import type { Ref } from "../types"
import { isSSR, useHook } from "./utils.js"

export function useRef<T>(current: T | null): Ref<T> {
  if (isSSR) return { current }
  return useHook("useRef", { current }, ({ hook }) => hook)
}
