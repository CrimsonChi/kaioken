import type { Ref } from "../types"
import { useHook } from "./utils.js"

export function useRef<T>(current: T | null): Ref<T> {
  return useHook("useRef", { current }, ({ hook }) => hook)
}
