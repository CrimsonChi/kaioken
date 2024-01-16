import { useHook } from "./utils.js"

type StateSetter<T> = T | ((prev: T) => T)

export function useState<T>(
  initial: T | (() => T)
): [T, (value: StateSetter<T>) => void] {
  return useHook(
    "useState",
    { state: undefined as T },
    ({ hook, oldHook, update }) => {
      if (!oldHook)
        hook.state = initial instanceof Function ? initial() : initial
      const setState = (setter: StateSetter<T>) => {
        hook.state = setter instanceof Function ? setter(hook.state) : setter
        update()
      }
      return [hook.state, setState]
    }
  )
}
