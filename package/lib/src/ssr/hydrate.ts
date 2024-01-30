import { mount } from "../"
export function hydrate(appFunc: () => JSX.Element, container: HTMLElement) {
  console.log("hydrate", appFunc, container)
  container.innerHTML = ""
  mount(appFunc, container)
}
