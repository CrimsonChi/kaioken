import { ctx } from "./globalContext.js"
import { useEffect } from "./hooks/index.js"
import type { StateSetter, VNode } from "./types"

export { createStore }

type MethodFactory<T> = (
  setState: (setter: StateSetter<T>) => void,
  getState: () => T
) => Record<string, (...args: any[]) => void>

type UseStoreArgs<T, U extends MethodFactory<T>> = { value: T } & ReturnType<U>

type Store<T, U extends MethodFactory<T>> = {
  <Selector extends (state: UseStoreArgs<T, U>) => unknown>(
    fn: Selector
  ): ReturnType<Selector>
  (): { value: T } & ReturnType<U>
  getState: () => T
  setState: (setter: StateSetter<T>) => void
  methods: ReturnType<U>
  subscribe: (fn: (value: T) => void) => () => void
} & ReturnType<U>

function createStore<T, U extends MethodFactory<T>>(
  initial: T,
  methodFactory: U
) {
  let value = initial
  const subscribers = new Set<VNode | Function>()
  const getState = () => value
  const setState = (setter: StateSetter<T>) => {
    value = setter instanceof Function ? setter(value) : setter
    subscribers.forEach((n) =>
      n instanceof Function ? n(value) : ctx.requestUpdate(n)
    )
  }
  const methods = methodFactory(setState, getState) as ReturnType<U>

  function useStore<Selector extends (selector: UseStoreArgs<T, U>) => unknown>(
    fn?: Selector
  ) {
    const node = ctx.curNode
    if (node) {
      subscribers.add(node)
      useEffect(() => () => subscribers.delete(node), [])
    }
    return fn
      ? (fn({ value, ...methods }) as ReturnType<Selector>)
      : { value, ...methods }
  }

  return Object.assign(useStore, {
    getState,
    setState,
    methods,
    subscribe: (fn: (state: T) => void) => {
      subscribers.add(fn)
      return (() => (subscribers.delete(fn), void 0)) as () => void
    },
  }) as Store<T, U>
}
