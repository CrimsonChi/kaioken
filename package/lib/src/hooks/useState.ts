import { useHook } from "./utils.js"

type StateSetter<T> = T | ((prev: T) => T)

export function useState<T>(state: T): [T, (value: StateSetter<T>) => void] {
  return useHook("useState", { state }, ({ hook, update }) => {
    const setState = (setter: StateSetter<T>) => {
      hook.state = setter instanceof Function ? setter(hook.state) : setter
      update()
    }
    return [hook.state, setState]
  })
}
