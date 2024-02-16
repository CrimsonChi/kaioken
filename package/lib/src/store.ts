import { ctx } from "./globalContext"
import { useEffect } from "./hooks"
import type { StateSetter, VNode } from "./types"

export { createStore }

type MutatorFactory<T> = (
  setState: (setter: StateSetter<T>) => void
) => Record<string, (...args: any[]) => void>

type UseStoreArgs<T, U extends MutatorFactory<T>> = { value: T } & ReturnType<U>

type Store<T, U extends MutatorFactory<T>> = {
  <Selector extends (state: UseStoreArgs<T, U>) => unknown>(
    fn: Selector
  ): ReturnType<Selector>
  getState: () => T
  setState: (setter: StateSetter<T>) => void
  subscribe: (fn: (value: T) => void) => () => void
} & ReturnType<U>

function createStore<T, U extends MutatorFactory<T>>(
  initial: T,
  mutatorFactory: U
) {
  let value = initial
  const subscribers = new Set<VNode | Function>()
  const setState = (setter: StateSetter<T>) => {
    value = setter instanceof Function ? setter(value) : setter
    subscribers.forEach((n) =>
      n instanceof Function ? n(value) : ctx.requestUpdate(n)
    )
  }
  const mutators = mutatorFactory(setState) as ReturnType<U>

  function useStore<Selector extends (state: UseStoreArgs<T, U>) => unknown>(
    fn: Selector
  ) {
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
  }) as Store<T, U>
}
