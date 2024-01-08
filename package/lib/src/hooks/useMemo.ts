import { getCurrentNode, getHook, setHook } from "./utils.js"

export function useMemo<T>(factory: () => T, deps: any[]): T {
  const node = getCurrentNode("useMemo must be called in a component")
  if (!node) return factory()

  const { hook, oldHook } = getHook(node, { deps, value: undefined as T })

  if (oldHook) {
    if (deps.length === 0 || deps.some((dep, i) => dep !== oldHook.deps[i])) {
      hook.value = factory()
      hook.deps = deps
    }
  } else {
    hook.value = factory()
  }

  setHook(node, hook)
  return hook.value
}
