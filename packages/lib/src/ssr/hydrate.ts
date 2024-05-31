import type { AppContext, AppContextOptions } from "../appContext"
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
  if (optionsOrRoot instanceof HTMLElement) {
    optionsOrRoot.innerHTML = ""
    return mount(appFunc, optionsOrRoot, appProps)
  }
  optionsOrRoot.root.innerHTML = ""
  return mount(appFunc, optionsOrRoot, appProps)
}
