import type { Ref } from "../types"
import { getCurrentNode, getHook, setHook } from "./utils.js"

export function useRef<T>(current: T | null): Ref<T> {
  const node = getCurrentNode("useRef")
  if (!node) return { current }

  const { hook } = getHook(node, { current })

  setHook(node, hook)
  return hook
}
