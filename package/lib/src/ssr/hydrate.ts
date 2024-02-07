import { Rec, mount } from "../"

export interface SSRProps {
  request: {
    path: string
    query: string
  }
}

export function hydrate<T extends Rec>(
  appFunc: (props: T) => JSX.Element,
  container: HTMLElement,
  appProps = {} as T
) {
  container.innerHTML = ""
  return mount(appFunc, container, appProps)
}
