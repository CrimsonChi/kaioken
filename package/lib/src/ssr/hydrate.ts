import { mount } from "../"

export interface SSRProps {
  request: {
    path: string
  }
}

export function hydrate(
  appFunc: (props: SSRProps) => JSX.Element,
  container: HTMLElement
) {
  console.log("hydrate", appFunc, container)
  container.innerHTML = ""

  if (!("kaioken_ssr_props" in window))
    throw new Error("kaioken_ssr_props not found in window scope")
  const appProps = window.kaioken_ssr_props as SSRProps

  mount(appFunc, container, appProps)
}
