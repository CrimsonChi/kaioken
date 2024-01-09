import { arrayChanged, getCurrentNode, getHook, setHook } from "./utils.js"

export function useMemo<T>(factory: () => T, deps: any[]): T {
  const node = getCurrentNode("useMemo must be called in a component")
  if (!node) return factory()

  const { hook, oldHook } = getHook(node, { deps, value: undefined as T })

  if (arrayChanged(deps, oldHook?.deps)) {
    hook.value = factory()
    hook.deps = deps
  } else {
    if (!oldHook) hook.value = factory()
  }

  setHook(node, hook)
  return hook.value
}
