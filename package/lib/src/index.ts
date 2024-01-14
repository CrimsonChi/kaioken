import type { Rec, VNode } from "./types"
import { createId, g } from "./globalState.js"
import { isValidChild, propFilters } from "./utils.js"
import { Component } from "./component.js"

export { mount, createElement, fragment, renderToString }

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

function renderToString(element: JSX.Element): string {
  if (element === null) return ""
  if (typeof element === "string") return element
  if (element instanceof Array) return element.map(renderToString).join("")
  if (typeof element === "number") return String(element)
  if (element.type === "TEXT_ELEMENT") return element.props.nodeValue ?? ""

  const children = element.props.children ?? []
  const props = element.props ?? {}

  if (typeof element.type === "string") {
    const attrs = Object.keys(props)
      .filter(propFilters.isProperty)
      .map((key) => `${key}="${props[key]}"`)
      .join(" ")
    return `<${element.type} ${attrs}>${children
      .map(renderToString)
      .join("")}</${element.type}>`
  }

  if (Component.isCtor(element.type)) {
    const instance = new (element.type as unknown as {
      new (props: Rec): Component
    })(element.props)
    instance.vNode = element as VNode
    instance.componentDidMount?.()
    return renderToString(instance.render())
  }

  return renderToString(element.type(element.props))
}
