import type { VNode } from "./types"
import { createId, g } from "./globalState.js"
import { isValidChild } from "./utils.js"

export { mount, createElement, fragment }

function mount(appFunc: () => JSX.Element, container: HTMLElement) {
  const node = createElement(
    container.nodeName.toLowerCase(),
    {},
    createElement(appFunc, {})
  )
  return g.mount(node, container)
}

function createElement(
  type: string | Function,
  props = {},
  ...children: (VNode | unknown)[]
): VNode {
  return {
    id: createId(),
    type,
    props: {
      ...props,
      children: children
        .flat()
        .filter(isValidChild)
        .map((child) =>
          typeof child === "object" ? child : createTextElement(String(child))
        ) as VNode[],
    },
  }
}

function createTextElement(nodeValue: string): VNode {
  return createElement("TEXT_ELEMENT", { nodeValue })
}

function fragment({ children }: { children: JSX.Element[] }) {
  return children as JSX.Element
}
