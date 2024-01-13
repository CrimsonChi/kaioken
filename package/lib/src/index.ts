import type { VNode } from "./types"
import { createId, g } from "./globalState.js"
import { isValidChild } from "./utils.js"
import { Component } from "./component.js"

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
  type: string | Function | typeof Component,
  props = {},
  ...children: (VNode | unknown)[]
): VNode {
  return {
    id: typeof type === "string" ? -1 : createId(),
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
