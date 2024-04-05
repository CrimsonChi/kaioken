import type { AppContext } from "./appContext"

export { ctx, node, nodeToCtxMap, contexts, renderMode }

const nodeToCtxMap = new WeakMap<Kaioken.VNode, AppContext>()
const contexts = new Set<AppContext>()

const node = {
  current: undefined as Kaioken.VNode | undefined,
}

const ctx = {
  current: undefined as unknown as AppContext,
}

const renderMode = {
  current: "dom" as "dom" | "string",
}
