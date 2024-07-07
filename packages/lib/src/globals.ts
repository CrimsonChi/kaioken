import type { AppContext } from "./appContext"

export { ctx, node, contexts, renderMode }

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
