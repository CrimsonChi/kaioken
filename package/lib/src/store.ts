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
  const subscribers = new Set<VNode>()
  const mutator = (setter: StateSetter<T>) => {
    value = setter instanceof Function ? setter(value) : setter
    subscribers.forEach((n) => ctx.requestUpdate(n))
  }
  const factory = settersFactory(mutator) as ReturnType<U>

  type S = { value: T } & ReturnType<U>

  return function useStore<Selector extends (s: S) => unknown>(fn: Selector) {
    const node = ctx.curNode
    if (node) {
      subscribers.add(node)
      useEffect(() => () => subscribers.delete(node), [])
    }
    return fn({ value, ...factory }) as ReturnType<Selector>
  }
}
