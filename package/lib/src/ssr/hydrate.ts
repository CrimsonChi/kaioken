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
  console.log("hydrate", appFunc, container)
  container.innerHTML = ""
  mount(appFunc, container, appProps)
}
