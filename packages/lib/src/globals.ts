import type { AppContext } from "./appContext"

export { ctx, node, renderMode, nodeToCtxMap }

const node = {
  current: undefined as Kaioken.VNode | undefined,
}

const ctx = {
  current: undefined as unknown as AppContext<any>,
}

const renderMode = {
  current: ("window" in globalThis ? "dom" : "string") as Kaioken.RenderMode,
}

const nodeToCtxMap = new WeakMap<Kaioken.VNode, AppContext<any>>()
