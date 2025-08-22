import { createKiruGlobalContext } from "./globalContext.js"
import { __DEV__ } from "./env.js"

export type * from "./types"
export * from "./appContext.js"
export * from "./context.js"
export * from "./cloneVNode.js"
export * from "./element.js"
export * from "./hooks/index.js"
export * from "./lazy.js"
export { memo } from "./memo.js"
export * from "./portal.js"
export * from "./renderToString.js"
export * from "./signals/index.js"
export { nextIdle, flushSync, requestUpdate } from "./scheduler.js"
export * from "./store.js"
export * from "./transition.js"

if ("window" in globalThis) {
  globalThis.window.__kiru ??= createKiruGlobalContext()
}
