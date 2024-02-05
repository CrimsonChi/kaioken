import type { Rec, VNode } from "./types"
import { setGlobalCtx, GlobalContext } from "./globalContext.js"
import { isVNode, isValidChild, propFilters, selfClosingTags } from "./utils.js"
import { Component } from "./component.js"

export type * from "./types"
export * from "./hooks"
export * from "./component.js"
export * from "./context.js"
export * from "./globalContext.js"
export * from "./memo.js"
export * from "./portal.js"
export * from "./router.js"
export * from "./transition.js"

export { mount, createElement, fragment, renderToString }

function mount<T extends Rec>(
  appFunc: (props: T) => JSX.Element,
  container: HTMLElement,
  appProps = {} as T
) {
  const node = createElement(
    container.nodeName.toLowerCase(),
    {},
    createElement(appFunc, appProps)
  )
  return setGlobalCtx(new GlobalContext()).mount(node, container)
}

function createElement(
  type: string | Function | typeof Component,
  props = {},
  ...children: (VNode | unknown)[]
): VNode {
  return {
    type,
    props: {
      ...props,
      children: (
        children.flat().filter(isValidChild) as (
          | VNode
          | string
          | (() => VNode)
        )[]
      ).map((child) => createChildElement(child)) as VNode[],
    },
  }
}

function createChildElement(child: VNode | string | (() => VNode)): VNode {
  if (isVNode(child)) return child
  if (typeof child === "function") {
    const node = child()
    return createChildElement(node)
  }
  return createTextElement(String(child))
}

function createTextElement(nodeValue: string): VNode {
  return createElement("TEXT_ELEMENT", { nodeValue })
}

function fragment({ children }: { children: JSX.Element[] }) {
  return children as JSX.Element
}

function renderToString(
  element: JSX.Element | (() => JSX.Element),
  ctx = setGlobalCtx(new GlobalContext())
): string {
  if (!element) return ""
  if (typeof element === "string") return element
  if (typeof element === "function") return renderToString(element())
  if (element instanceof Array)
    return element.map((el) => renderToString(el, ctx)).join("")
  if (typeof element === "number") return String(element)
  if (element.type === "TEXT_ELEMENT") return element.props.nodeValue ?? ""

  const children = element.props.children ?? []
  const props = element.props ?? {}

  if (typeof element.type === "string") {
    if (element.type === "form" && typeof props.action === "function") {
      delete props.action
    }
    const isSelfClosing = selfClosingTags.includes(element.type)
    const attrs = Object.keys(props)
      .filter(propFilters.isProperty)
      .map(
        (key) =>
          `${transformPropNameToHtmlAttr(key)}="${transformPropValueToHtmlAttrValue(key, props[key])}"`
      )
      .join(" ")
    const open = `<${element.type}${attrs ? ` ${attrs}` : ""}${
      isSelfClosing ? " /" : ""
    }>`
    if (isSelfClosing) return open
    return `${open}${children.map((el) => renderToString(el, ctx)).join("")}</${
      element.type
    }>`
  }
  ctx.curNode = element

  if (Component.isCtor(element.type)) {
    const instance = new (element.type as unknown as {
      new (props: Rec): Component
    })(element.props)
    instance.componentDidMount?.()
    return renderToString(instance.render())
  }

  return renderToString(element.type(element.props))
}

function transformPropNameToHtmlAttr(key: string) {
  switch (key.toLowerCase()) {
    case "classname":
      return "class"
    case "htmlfor":
      return "for"
    default:
      return key
  }
}

function styleObjectToCss(styleObject: Partial<CSSStyleDeclaration>) {
  let cssString = ""
  for (const key in styleObject) {
    const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
    cssString += `${cssKey}:${styleObject[key]};`
  }
  return cssString
}

function transformPropValueToHtmlAttrValue(key: string, value: unknown) {
  switch (key) {
    case "style":
      if (typeof value === "object" && !!value) return styleObjectToCss(value)
    default:
      return String(value)
  }
}
