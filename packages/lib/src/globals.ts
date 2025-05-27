import type { AppContext } from "./appContext"

export { ctx, node, renderMode, nodeToCtxMap }

const node = {
  current: null as Kaioken.VNode | null,
}

const ctx = {
  current: null! as AppContext<any>,
}

const renderMode = {
  current: ("window" in globalThis ? "dom" : "string") as Kaioken.RenderMode,
}

const nodeToCtxMap = new WeakMap<Kaioken.VNode, AppContext<any>>()
