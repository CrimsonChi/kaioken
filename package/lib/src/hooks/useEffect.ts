import { getCurrentNode, getHook, setHook, cleanupHook } from "./utils.js"
import { g } from "../globalState.js"

export function useEffect(callback: Function, deps: any[] = []) {
  const node = getCurrentNode("useEffect must be called in a component")
  if (!node) return

  const { hook, oldHook } = getHook(node, {
    deps,
    callback,
    cleanup: undefined,
  })

  const hasChangedDeps =
    !oldHook ||
    deps.length === 0 ||
    (oldHook && deps.some((dep, i) => dep !== oldHook.deps[i]))

  if (hasChangedDeps) {
    if (oldHook) {
      cleanupHook(oldHook)
    }
    g.pendingEffects.push(() => {
      const cleanup = callback()
      if (cleanup && typeof cleanup === "function") {
        hook.cleanup = cleanup
      }
    })
  }

  setHook(node, hook)
}
