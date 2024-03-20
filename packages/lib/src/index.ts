import {
  ctx,
  GlobalContext,
  GlobalContextOptions,
  node,
  nodeToCtxMap,
  renderMode,
} from "./globalContext.js"
import {
  isValidChild,
  isVNode,
  propFilters,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
  selfClosingTags,
} from "./utils.js"
import { Component } from "./component.js"
import { elementTypes as et } from "./constants.js"

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
  options: GlobalContextOptions,
  appProps?: T
): Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  root: HTMLElement,
  appProps?: T
): Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  optionsOrRoot: HTMLElement | GlobalContextOptions,
  appProps = {} as T
): Kaioken.VNode {
  let opts, root
  if (optionsOrRoot instanceof HTMLElement) {
    root = optionsOrRoot
  } else {
    opts = optionsOrRoot
    root = optionsOrRoot.root
  }

  ctx.current = new GlobalContext(opts)
  const node = createElement(
    root.nodeName.toLowerCase(),
    {},
    createElement(appFunc, appProps)
  )
  return ctx.current.mount(node, root)
}

function createElement(
  type: string | Function | typeof Component,
  props = {},
  ...children: JSX.Element[]
): VNode {
  const node = {
    type,
    index: 0,
    props: {
      ...props,
      children: children.flat().filter(isValidChild).map(createChildElement),
    },
  }
  nodeToCtxMap.set(node, ctx.current)
  return node
}

function createChildElement(child: JSX.Element): VNode {
  if (isVNode(child)) return child
  return createTextElement(String(child))
}

function createTextElement(nodeValue: string): VNode {
  return createElement(et.text, { nodeValue })
}

function fragment({
  children,
  ...rest
}: { children: JSX.Element[] } & Record<string, unknown>) {
  return createElement(et.fragment, rest, ...children)
}

function renderToString<T extends Record<string, unknown>>(
  el: JSX.Element | ((props: T) => JSX.Element),
  elProps = {} as T
) {
  const prev = renderMode.current
  renderMode.current = "string"
  const res = renderToString_internal(el, elProps)
  renderMode.current = prev
  return res
}

function renderToString_internal<T extends Record<string, unknown>>(
  el: JSX.Element | ((props: T) => JSX.Element),
  elProps = {} as T
): string {
  if (el === null) return ""
  if (el === undefined) return ""
  if (typeof el === "boolean") return ""
  if (typeof el === "string") return el
  if (typeof el === "number") return el.toString()
  if (typeof el === "function")
    return renderToString_internal(createElement(el, elProps), elProps)
  if (el instanceof Array)
    return el.map((el) => renderToString(el, el.props)).join("")

  const props = el.props ?? {}
  const children = props.children ?? []
  const type = el.type
  if (type === et.text) return props.nodeValue ?? ""
  if (type === et.fragment)
    return children.map((c) => renderToString_internal(c, props)).join("")

  if (typeof type === "string") {
    const sc = selfClosingTags.includes(type)
    const attrs = Object.keys(props)
      .filter(propFilters.isProperty)
      .map(
        (k) => `${propToHtmlAttr(k)}="${propValueToHtmlAttrValue(k, props[k])}"`
      )
      .join(" ")

    const open = `<${type} ${attrs}`
    return (
      open +
      (!sc
        ? `>${children.map((c) => renderToString_internal(c, c.props)).join("")}</${type}>`
        : "/>")
    )
  }

  node.current = el
  if (Component.isCtor(type)) {
    const instance = new (type as unknown as {
      new (props: Record<string, unknown>): Component
    })(props)
    instance.componentDidMount?.()
    return renderToString_internal(instance.render(), props)
  }

  return renderToString_internal(type(props), props)
}
