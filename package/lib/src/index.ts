import type { VNode } from "./types"
import { g } from "./globalState.js"
import { isValidChild } from "./utils.js"

export { mount, createElement, fragment }

function mount(appFunc: () => VNode, container: HTMLElement) {
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
    hooks: [],
  }
}

function createTextElement(text: string): VNode {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
    hooks: [],
  }
}

function fragment({ children }: { children: JSX.Element[] }) {
  return children as JSX.Element
}
