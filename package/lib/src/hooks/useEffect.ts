import { g } from "../globalState.js"
import {
  cleanupHook,
  depsRequireChange,
  getCurrentNode,
  getHook,
  setHook,
} from "./utils.js"

export function useEffect(
  callback: () => undefined | (() => void),
  deps: any[] = []
) {
  const node = getCurrentNode("useEffect")
  if (!node) return

  const { hook, oldHook } = getHook(node, {
    deps,
    callback,
    cleanup: undefined as undefined | (() => void),
  })

  if (depsRequireChange(deps, oldHook?.deps)) {
    hook.deps = deps
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
