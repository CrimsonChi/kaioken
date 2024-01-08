import { getCurrentNode, getHook, setHook } from "./utils.js"
import { g } from "../globalState.js"

type StateSetter<T> = T | ((prev: T) => T)

export function useState<T>(initial: T): [T, (value: StateSetter<T>) => void] {
  const node = getCurrentNode("useState must be called in a component")
  if (!node) return [initial, () => {}]

  const { hook } = getHook(node, { state: initial })

  const setState = (setter: StateSetter<T>) => {
    hook.state = setter instanceof Function ? setter(hook.state) : setter
    g.setWipNode(node)
  }

  setHook(node, hook)
  return [hook.state, setState]
}
