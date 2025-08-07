import {
  createAppContext,
  type AppContext,
  type AppContextOptions,
} from "./appContext.js"
import { ctx } from "./globals.js"
import { createKiruGlobalContext } from "./globalContext.js"
import { __DEV__ } from "./env.js"
import { KiruError } from "./error.js"

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
export * from "./store.js"
export * from "./transition.js"

if ("window" in globalThis) {
  globalThis.window.__kiru ??= createKiruGlobalContext()
}

export function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  options: AppContextOptions,
  appProps?: T
): Promise<AppContext<T>>

export function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  root: HTMLElement,
  appProps?: T
): Promise<AppContext<T>>

export function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  optionsOrRoot: HTMLElement | AppContextOptions,
  appProps = {} as T
): Promise<AppContext<T>> {
  let root: HTMLElement, opts: AppContextOptions | undefined
  if (optionsOrRoot instanceof HTMLElement) {
    root = optionsOrRoot
    opts = { root }
  } else {
    opts = optionsOrRoot
    root = optionsOrRoot.root!
    if (__DEV__) {
      if (!(root instanceof HTMLElement)) {
        throw new KiruError("Root node must be an HTMLElement")
      }
    }
  }
  ctx.current = createAppContext<T>(appFunc, appProps, opts)
  return ctx.current.mount()
}
