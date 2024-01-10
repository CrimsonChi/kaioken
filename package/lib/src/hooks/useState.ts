import { g } from "../globalState.js"
import { getCurrentNode, getHook, setHook } from "./utils.js"

type StateSetter<T> = T | ((prev: T) => T)

export function useState<T>(initial: T): [T, (value: StateSetter<T>) => void] {
  const node = getCurrentNode("useState")
  if (!node) return [initial, () => {}]

  const { hook } = getHook(node, { state: initial })

  const setState = (setter: StateSetter<T>) => {
    hook.state = setter instanceof Function ? setter(hook.state) : setter
    g.requestUpdate(node)
  }

  setHook(node, hook)
  return [hook.state, setState]
}
