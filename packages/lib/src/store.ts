import { sideEffectsEnabled, useHook } from "./hooks/utils.js"
import { shallowCompare } from "./utils.js"

export { createStore }
export type { Store, MethodFactory }

type MethodFactory<T> = (
  setState: (setter: Kaioken.StateSetter<T>) => void,
  getState: () => T
) => Record<string, Function>

type StoreHook<T, U extends MethodFactory<T>> = {
  <R>(sliceFn: (state: T) => R): { value: R } & ReturnType<U>
  <
    F extends null | ((state: T) => unknown),
    R extends F extends Function ? ReturnType<F> : T,
  >(
    sliceFn: F,
    equality: (prev: R, next: R, compare: typeof shallowCompare) => boolean
  ): { value: R } & ReturnType<U>
  (): { value: T } & ReturnType<U>
}

type Store<T, U extends MethodFactory<T>> = StoreHook<T, U> & {
  getState: () => T
  setState: (setter: Kaioken.StateSetter<T>) => void
  methods: ReturnType<U>
  subscribe: (fn: (value: T) => void) => () => void
}

type NodeSliceCompute = [
  Function | null,
  (
    | ((prev: any, next: any, compare: typeof shallowCompare) => boolean)
    | undefined
  ),
  unknown,
]

function createStore<T, U extends MethodFactory<T>>(
  initial: T,
  methodFactory: U
): Store<T, U> {
  let state = initial
  let stateIteration = 0
  const subscribers = new Set<Kaioken.VNode | Function>()
  const nodeToSliceComputeMap = new WeakMap<Kaioken.VNode, NodeSliceCompute[]>()

  const getState = () => state
  const setState = (setter: Kaioken.StateSetter<T>) => {
    state = setter instanceof Function ? setter(state) : setter
    subscribers.forEach((n) => {
      if (n instanceof Function) return n(state)
      const computes = nodeToSliceComputeMap.get(n)
      if (computes) {
        let computeChanged = false
        for (let i = 0; i < computes.length; i++) {
          if (!computes[i]) continue
          const [sliceFn, eq, slice] = computes[i]
          const computeRes = sliceFn === null ? state : sliceFn(state)
          computes[i] = [sliceFn, eq, computeRes]

          if (computeChanged) continue
          if (eq && eq(slice, computeRes, shallowCompare)) {
            continue
          } else if (!eq && shallowCompare(slice, computeRes)) {
            continue
          }

          computeChanged = true
        }
        if (!computeChanged) return
      }
      n.ctx.requestUpdate(n)
    })
    stateIteration++
  }
  const methods = methodFactory(setState, getState) as ReturnType<U>

  function useStore<R>(
    sliceFn?: null | ((state: T) => R),
    equality?: (prev: R, next: R, compare: typeof shallowCompare) => boolean
  ) {
    if (!sideEffectsEnabled()) {
      if (sliceFn) {
        return { value: sliceFn(state), ...methods }
      }
      return { value: state, ...methods }
    }

    return useHook(
      "useStore",
      { stateSlice: null as any as T | R, lastChangeSync: -1 },
      ({ hook, oldHook, vNode }) => {
        if (!oldHook) {
          subscribers.add(vNode)
          hook.cleanup = () => {
            nodeToSliceComputeMap.delete(vNode)
            subscribers.delete(vNode)
          }
          hook.debug = () => {
            return { value: hook.stateSlice }
          }
        }

        if (hook.lastChangeSync !== stateIteration) {
          hook.stateSlice = sliceFn ? sliceFn(state) : state
          hook.lastChangeSync = stateIteration

          if (sliceFn || equality) {
            const computes = nodeToSliceComputeMap.get(vNode) ?? []
            computes[vNode.ctx.hookIndex - 1] = [
              sliceFn ?? null,
              equality,
              hook.stateSlice,
            ]
            nodeToSliceComputeMap.set(vNode, computes)
          }
        }

        return { value: hook.stateSlice, ...methods }
      }
    )
  }

  return Object.assign(useStore, {
    getState,
    setState,
    methods,
    subscribe: (fn: (state: T) => void) => {
      subscribers.add(fn)
      return (() => (subscribers.delete(fn), void 0)) as () => void
    },
  })
}
