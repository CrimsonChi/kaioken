import { isSSR, useHook } from "./utils.js"

export function useState<T>(
  initial: T | (() => T)
): [T, (value: Kaioken.StateSetter<T>) => void] {
  if (isSSR) {
    return [initial instanceof Function ? initial() : initial, () => {}]
  }

  return useHook(
    "useState",
    { state: undefined as T },
    ({ hook, oldHook, update }) => {
      if (!oldHook)
        hook.state = initial instanceof Function ? initial() : initial
      const setState = (setter: Kaioken.StateSetter<T>) => {
        const newState =
          setter instanceof Function ? setter(hook.state) : setter
        if (newState !== hook.state) {
          hook.state = newState
          update()
        }
      }
      return [hook.state, setState]
    }
  )
}
