import type { GlobalContext } from "./globalContext"

export { ctx, node, nodeToCtxMap, contexts, renderMode }

const nodeToCtxMap = new WeakMap<Kaioken.VNode, GlobalContext>()
const contexts = new Set<GlobalContext>()

const node = {
  current: undefined as Kaioken.VNode | undefined,
}

const ctx = {
  current: undefined as unknown as GlobalContext,
}

const renderMode = {
  current: "dom" as "dom" | "string",
}
