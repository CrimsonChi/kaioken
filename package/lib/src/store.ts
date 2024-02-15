import { ctx } from "./globalContext"
import { useEffect } from "./hooks"
import type { VNode } from "./types"

export { createStore }

type StateSetter<T> = T | ((prev: T) => T)

function createStore<
  T,
  U extends (
    mutator: (setter: StateSetter<T>) => void
  ) => Record<string, (...args: any[]) => void>,
>(initial: T, settersFactory: U) {
  let value = initial
  const subscribers = new Set<VNode | Function>()
  const setState = (setter: StateSetter<T>) => {
    value = setter instanceof Function ? setter(value) : setter
    subscribers.forEach((n) =>
      n instanceof Function ? n(value) : ctx.requestUpdate(n)
    )
  }
  const mutators = settersFactory(setState) as ReturnType<U>

  function useStore<
    Selector extends (state: { value: T } & ReturnType<U>) => unknown,
  >(fn: Selector) {
    const node = ctx.curNode
    if (node) {
      subscribers.add(node)
      useEffect(() => () => subscribers.delete(node), [])
    }
    return fn({ value, ...mutators }) as ReturnType<Selector>
  }

  return Object.assign(useStore, {
    getState: () => value,
    setState,
    subscribe: (fn: (state: T) => void) => {
      subscribers.add(fn)
      return (() => (subscribers.delete(fn), void 0)) as () => void
    },
  })
}
