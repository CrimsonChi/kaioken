import { depsRequireChange, getCurrentNode, getHook, setHook } from "./utils.js"

type useCallbackHook<T extends (...args: any[]) => any> = {
  callback: T
  deps: any[]
}

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  const node = getCurrentNode("useCallback")
  if (!node) return callback

  const { hook, oldHook } = getHook<useCallbackHook<T>>(node, {
    callback,
    deps,
  })

  if (depsRequireChange(deps, oldHook?.deps)) {
    hook.callback = callback
  }

  setHook(node, hook)
  return hook.callback
}
