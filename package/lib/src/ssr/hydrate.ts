import { mount } from "../"

export interface SSRProps {
  request: {
    path: string
  }
}

export function hydrate(
  appFunc: (ssrProps: SSRProps) => JSX.Element,
  container: HTMLElement
) {
  console.log("hydrate", appFunc, container)
  container.innerHTML = ""

  if (!("kaioken_ssr_props" in window)) throw new Error("")
  const appProps = window.kaioken_ssr_props as SSRProps

  mount(appFunc, container, appProps)
}
