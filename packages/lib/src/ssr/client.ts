import type { AppContext, AppContextOptions } from "../appContext"
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
  const prevRenderMode = renderMode.current
  renderMode.current = "hydrate"
  return new Promise((resolve) => {
    mount(appFunc, optionsOrRoot as any, appProps).then((ctx) => {
      renderMode.current = prevRenderMode
      resolve(ctx)
    })
  })
}
