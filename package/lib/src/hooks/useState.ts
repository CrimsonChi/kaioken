import { useHook } from "./utils.js"

type StateSetter<T> = T | ((prev: T) => T)

export function useState<T>(initial: T): [T, (value: StateSetter<T>) => void] {
  return useHook(
    "useState",
    { state: initial },
    ({ hook, node, requestUpdate }) => {
      const setState = (setter: StateSetter<T>) => {
        hook.state = setter instanceof Function ? setter(hook.state) : setter
        requestUpdate(node)
      }
      return [hook.state, setState]
    }
  )
}
