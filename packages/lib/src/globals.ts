import type { AppContext } from "./appContext"

export {
  ctx,
  node,
  nodeToCtxMap,
  contexts,
  renderMode,
  hydrationStack,
  childIndexStack,
}

const nodeToCtxMap = new WeakMap<Kaioken.VNode, AppContext>()
const contexts: Array<AppContext<any>> = []

const node = {
  current: undefined as Kaioken.VNode | undefined,
}

const ctx = {
  current: undefined as unknown as AppContext<any>,
}

const renderMode = {
  current: "dom" as "dom" | "hydrate" | "string" | "stream",
}

const hydrationStack = [] as Array<HTMLElement | SVGElement | Text>
const childIndexStack = [] as Array<number>
