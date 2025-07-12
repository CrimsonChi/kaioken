import type { AppContext, AppContextOptions } from "../appContext"
import { hydrationStack } from "../hydration.js"
import { renderMode } from "../globals.js"
import { mount } from "../index.js"

export function hydrate<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  container: AppContextOptions,
  appProps?: T
): Promise<AppContext<T>>

export function hydrate<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  container: HTMLElement,
  appProps?: T
): Promise<AppContext<T>>

export function hydrate<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  optionsOrRoot: HTMLElement | AppContextOptions,
  appProps = {} as T
) {
  hydrationStack.clear()
  const prevRenderMode = renderMode.current
  renderMode.current = "hydrate"
  return mount(appFunc, optionsOrRoot as any, appProps).finally(() => {
    renderMode.current = prevRenderMode
  })
}
