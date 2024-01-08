import type { Ref } from "../types"
import { getHook, setHook, getCurrentNode } from "./utils.js"

export function useRef<T>(current: T | null): Ref<T> {
  const node = getCurrentNode("useRef must be called in a component")
  if (!node) return { current }

  const { hook } = getHook(node, { current })

  setHook(node, hook)
  return hook
}
