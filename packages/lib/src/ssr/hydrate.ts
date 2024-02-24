import { mount } from "../index.js"

export interface SSRProps {
  request: {
    path: string
    query: string
  }
}

export function hydrate<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  container: HTMLElement,
  appProps = {} as T
) {
  container.innerHTML = ""
  return mount(appFunc, container, appProps)
}
