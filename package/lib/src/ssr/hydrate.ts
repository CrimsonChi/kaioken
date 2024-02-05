import { mount } from "../"

export interface SSRProps {
  request: {
    path: string
    query: string
  }
}

export function hydrate(
  appFunc: (props: SSRProps) => JSX.Element,
  container: HTMLElement
) {
  console.log("hydrate", appFunc, container)
  container.innerHTML = ""
  mount(appFunc, container)
}
