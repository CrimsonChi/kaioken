import { __DEV__ } from "../env.js"
import { HookCallback, useHook } from "./utils.js"

export function useId() {
  return useHook("useId", createUseIdState, useIdCallback)
}

type UseIdState = {
  id: string
  idx: number
}

const createUseIdState = (): UseIdState => ({
  id: "",
  idx: 0,
})

const useIdCallback: HookCallback<UseIdState> = ({ hook, isInit, vNode }) => {
  if (__DEV__) {
    hook.dev = {
      devtools: { get: () => ({ id: hook.id }) },
    }
  }
  if (isInit || vNode.index !== hook.idx) {
    hook.idx = vNode.index
    const accumulator: number[] = []
    let n: Kaioken.VNode | undefined = vNode
    while (n) {
      accumulator.push(n.index)
      accumulator.push(n.depth)
      n = n.parent
    }
    hook.id = `k:${BigInt(accumulator.join("")).toString(36)}`
  }
  return hook.id
}
