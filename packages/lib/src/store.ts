import { nodeToCtxMap } from "./globals.js"
import { cleanupHook, shouldExecHook, useHook } from "./hooks/utils.js"
import { shallowCompare } from "./utils.js"

export { createStore }
export type { Store, MethodFactory }

type MethodFactory<T> = (
  setState: (setter: Kaioken.StateSetter<T>) => void,
  getState: () => T
) => Record<string, (...args: any[]) => void>

type Store<T, U extends MethodFactory<T>> = {
  <R>(sliceFn: (state: T) => R): { value: R } & ReturnType<U>
  <R>(
    sliceFn: (state: T) => R,
    equality: (prev: R, next: R, compare: typeof shallowCompare) => boolean
  ): { value: R } & ReturnType<U>
  (): { value: T } & ReturnType<U>
  getState: () => T
  setState: (setter: Kaioken.StateSetter<T>) => void
  methods: ReturnType<U>
  subscribe: (fn: (value: T) => void) => () => void
}

function createStore<T, U extends MethodFactory<T>>(
  initial: T,
  methodFactory: U
) {
  let value = initial
  const subscribers = new Set<Kaioken.VNode | Function>()
  const nodeToSliceComputeMap = new WeakMap<
    Kaioken.VNode,
    [
      Function,
      (
        | ((prev: any, next: any, compare: typeof shallowCompare) => boolean)
        | undefined
      ),
      unknown,
    ][]
  >()

  const getState = () => value
  const setState = (setter: Kaioken.StateSetter<T>) => {
    value = setter instanceof Function ? setter(value) : setter
    subscribers.forEach((n) => {
      if (n instanceof Function) return n(value)
      const computes = nodeToSliceComputeMap.get(n)
      if (computes) {
        let computeChanged = false
        for (let i = 0; i < computes.length; i++) {
          const [sliceFn, eq, slice] = computes[i]

          const next = sliceFn(value)
          computes[i] = [sliceFn, eq, next]
          if (computeChanged) continue
          if (eq && eq(slice, next, shallowCompare)) {
            continue
          } else if (!eq && shallowCompare(slice, next)) {
            continue
          }

          computeChanged = true
        }
        if (!computeChanged) return
      }
      nodeToCtxMap.get(n)!.requestUpdate(n)
    })
  }
  const methods = methodFactory(setState, getState) as ReturnType<U>

  function useStore<R>(
    sliceFn?: (state: T) => R,
    equality?: (prev: R, next: R) => boolean
  ) {
    if (!shouldExecHook()) {
      if (sliceFn) {
        return { value: sliceFn(value), ...methods }
      }
      return { value, ...methods }
    }

    return useHook("useStore", {}, ({ hook, oldHook, vNode }) => {
      if (oldHook) {
        cleanupHook(oldHook)
      }
      const stateSlice = sliceFn ? sliceFn(value) : value
      if (sliceFn) {
        const computes = nodeToSliceComputeMap.get(vNode) ?? []
        computes.push([sliceFn, equality, stateSlice])
        nodeToSliceComputeMap.set(vNode, computes)
      }

      subscribers.add(vNode)
      hook.cleanup = () => {
        nodeToSliceComputeMap.delete(vNode)
        subscribers.delete(vNode)
      }

      return { value: stateSlice, ...methods }
    })
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
