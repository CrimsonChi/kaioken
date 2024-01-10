import { g } from "../globalState.js"
import { getHook, setHook, getCurrentNode } from "./utils.js"

export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  initial: T
): [T, (action: A) => void] {
  const node = getCurrentNode("useReducer")
  if (!node) return [initial, () => initial]

  const { hook } = getHook(node, { state: initial })

  const dispatch = (action: A) => {
    hook.state = reducer(hook.state, action)
    g.setWipNode(node)
  }

  setHook(node, hook)
  return [hook.state, dispatch]
}
