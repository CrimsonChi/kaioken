import { g } from "../globalState.js"
import { getCurrentNode, getHook, setHook } from "./utils.js"

export function useOptimistic<T, U>(
  initial: T,
  setter: (prev: T, newValue: U) => T
): [T, (value: U) => void] {
  const node = getCurrentNode("useState must be called in a component")
  if (!node) return [initial, () => {}]

  const { hook, oldHook } = getHook(node, {
    state: initial,
    isRenderTrigger: false,
    queue: [] as Function[],
  })

  if (!oldHook) console.log("new hook")

  if (hook.isRenderTrigger) {
    hook.isRenderTrigger = false
  } else {
    hook.state = initial
    hook.queue.shift()?.(hook.state)
    for (const f of hook.queue) {
      hook.state = f(hook.state)
    }
  }

  const setState = (newValue: U) => {
    hook.state = setter(hook.state, newValue)
    hook.queue.push((state: T) => setter(state, newValue))
    hook.isRenderTrigger = true
    g.setWipNode(node)
  }

  setHook(node, hook)
  return [hook.state, setState]
}
