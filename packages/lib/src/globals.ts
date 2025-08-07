import type { AppContext } from "./appContext"

export { node, hookIndex, ctx, renderMode, nodeToCtxMap }

const node = {
  current: null as Kiru.VNode | null,
}

const hookIndex = {
  current: 0,
}

const ctx = {
  current: null! as AppContext<any>,
}

const renderMode = {
  current: ("window" in globalThis ? "dom" : "string") as Kiru.RenderMode,
}

const nodeToCtxMap = new WeakMap<Kiru.VNode, AppContext<any>>()
