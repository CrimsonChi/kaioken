import type { Prettify } from "./types.utils.js"
import { __DEV__ } from "./env.js"
import { sideEffectsEnabled, useHook } from "./hooks/utils.js"
import { getVNodeAppContext, safeStringify, shallowCompare } from "./utils.js"
import { $HMR_ACCEPT } from "./constants.js"
import { HMRAccept } from "./hmr.js"

export { createStore }
export type { Store, MethodFactory }

type MethodFactory<T> = (
  setState: (setter: Kaioken.StateSetter<T>) => void,
  getState: () => T
) => Record<string, Function>

type StoreHook<T, U extends Record<string, Function>> = {
  <R>(sliceFn: (state: T) => R): Prettify<{ value: R } & U>
  <
    F extends null | ((state: T) => unknown),
    R extends F extends Function ? ReturnType<F> : T
  >(
    sliceFn: F,
    equality: (prev: R, next: R, compare: typeof shallowCompare) => boolean
  ): Prettify<{ value: R } & U>
  (): Prettify<{ value: T } & U>
}

type Store<T, U extends Record<string, Function>> = StoreHook<T, U> & {
  getState: () => T
  setState: (setter: Kaioken.StateSetter<T>) => void
  methods: U
  subscribe: (fn: (value: T) => void) => () => void
}

type NodeSliceCompute = {
  sliceFn: Function | null
  eq:
    | ((prev: any, next: any, compare: typeof shallowCompare) => boolean)
    | undefined
  slice: any
}

function createStore<T, U extends MethodFactory<T>>(
  initial: T,
  methodFactory: U
): Store<T, ReturnType<U>> {
  // todo: instead of stringifying the initial state, we should use raw code comparison
  const $initial = safeStringify(initial)
  let state = initial
  let stateIteration = 0
  const subscribers = new Set<Kaioken.VNode | Function>()
  let nodeToSliceComputeMap = new WeakMap<Kaioken.VNode, NodeSliceCompute[]>()

  const getState = () => state
  const setState = (setter: Kaioken.StateSetter<T>) => {
    state = typeof setter === "function" ? (setter as Function)(state) : setter
    subscribers.forEach((n) => {
      if (typeof n === "function") return n(state)
      const computes = nodeToSliceComputeMap.get(n)
      if (computes) {
        let computeChanged = false
        for (let i = 0; i < computes.length; i++) {
          if (!computes[i]) continue
          const { sliceFn, eq, slice } = computes[i]
          const computeRes = sliceFn === null ? state : sliceFn(state)
          computes[i] = { sliceFn, eq, slice: computeRes }

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
      getVNodeAppContext(n).requestUpdate(n)
    })
    stateIteration++
  }
  const methods = methodFactory(setState, getState) as ReturnType<U>

  function useStore<R>(
    sliceFn: null | ((state: T) => R) = null,
    equality?: (prev: R, next: R, compare: typeof shallowCompare) => boolean
  ) {
    if (!sideEffectsEnabled()) {
      return { value: sliceFn ? sliceFn(state) : state, ...methods }
    }
    return useHook(
      "useStore",
      { stateSlice: null as any as T | R, lastChangeSync: -1 },
      ({ hook, isInit, vNode, index }) => {
        if (__DEV__) {
          hook.dev = {
            devtools: {
              get: () => ({ value: hook.stateSlice }),
            },
          }
        }
        if (isInit) {
          subscribers.add(vNode)
          hook.stateSlice = sliceFn ? sliceFn(state) : state
          if (sliceFn || equality) {
            const computes = nodeToSliceComputeMap.get(vNode) ?? []
            computes[index] = {
              sliceFn,
              eq: equality,
              slice: hook.stateSlice,
            }
            nodeToSliceComputeMap.set(vNode, computes)
          }
          hook.cleanup = () => {
            nodeToSliceComputeMap.delete(vNode)
            subscribers.delete(vNode)
          }
        }

        if (hook.lastChangeSync !== stateIteration) {
          hook.lastChangeSync = stateIteration
          const compute = (nodeToSliceComputeMap.get(vNode) ?? [])?.[index]
          hook.stateSlice = compute ? compute.slice : state
        }

        return { value: hook.stateSlice, ...methods }
      }
    )
  }

  const store = Object.assign(useStore, {
    getState,
    setState,
    methods,
    subscribe: (fn: (state: T) => void) => {
      subscribers.add(fn)
      return (() => (subscribers.delete(fn), void 0)) as () => void
    },
  })

  if (__DEV__) {
    return Object.assign(store, {
      [$HMR_ACCEPT]: {
        provide: () => ({
          $initial,
          state,
          subscribers,
          nodeToSliceComputeMap,
        }),
        inject: (prev) => {
          prev.subscribers.forEach((sub) => subscribers.add(sub))
          nodeToSliceComputeMap = prev.nodeToSliceComputeMap
          if ($initial === prev.$initial) {
            setState(prev.state)
          }
        },
        destroy: () => {
          subscribers.clear()
          nodeToSliceComputeMap = new WeakMap()
        },
      } satisfies HMRAccept<{
        $initial: string
        state: T
        subscribers: Set<Kaioken.VNode | Function>
        nodeToSliceComputeMap: WeakMap<Kaioken.VNode, NodeSliceCompute[]>
      }>,
    })
  }

  return store
}
