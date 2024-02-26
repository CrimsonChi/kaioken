import { ctx, GlobalContext, node } from "./globalContext.js"
import { isVNode, isValidChild, propFilters, selfClosingTags } from "./utils.js"
import { Component } from "./component.js"

export type * from "./types"
export * from "./hooks/index.js"
export * from "./component.js"
export * from "./context.js"
export * from "./globalContext.js"
export * from "./memo.js"
export * from "./portal.js"
export * from "./router.js"
export * from "./store.js"
export * from "./transition.js"

export { mount, createElement, fragment, renderToString }

type VNode = Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  container: HTMLElement,
  appProps = {} as T
) {
  ctx.current = new GlobalContext()
  const node = createElement(
    container.nodeName.toLowerCase(),
    {},
    createElement(appFunc, appProps)
  )
  return ctx.current.mount(node, container)
}

function createElement(
  type: string | Function | typeof Component,
  props = {},
  ...children: (VNode | unknown)[]
): VNode {
  const node = {
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

  return node
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

function renderToString<T extends Record<string, unknown>>(
  element: JSX.Element | ((props: T) => JSX.Element),
  elementProps = {} as T,
  ctx = new GlobalContext()
): string {
  if (!element) return ""
  if (typeof element === "string") return element
  if (typeof element === "function")
    return renderToString(element(elementProps))
  if (element instanceof Array)
    return element.map((el) => renderToString(el, el.props, ctx)).join("")
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
    return `${open}${children.map((el) => renderToString(el, el.props, ctx)).join("")}</${
      element.type
    }>`
  }
  node.current = element

  if (Component.isCtor(element.type)) {
    const instance = new (element.type as unknown as {
      new (props: Record<string, unknown>): Component
    })(element.props)
    // instance.componentDidMount?.()
    return renderToString(instance.render(), element.props, ctx)
  }

  return renderToString(element.type(element.props), element.props, ctx)
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
