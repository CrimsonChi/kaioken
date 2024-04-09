import { AppContext, AppContextOptions } from "./appContext.js"
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
import { contexts, ctx, node, nodeToCtxMap, renderMode } from "./globals.js"
import { KaiokenGlobalContext } from "./globalContext.js"

export type * from "./types"
export * from "./hooks/index.js"
export * from "./children.js"
export * from "./component.js"
export * from "./context.js"
export * from "./appContext.js"
export * from "./memo.js"
export * from "./portal.js"
export * from "./router.js"
export * from "./signal.js"
export * from "./store.js"
export * from "./transition.js"

export { mount, createElement, fragment, renderToString }

if ("window" in globalThis) {
  window.__kaioken = window.__kaioken ?? new KaiokenGlobalContext()
}

type VNode = Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  options: AppContextOptions,
  appProps?: T
): Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  root: HTMLElement,
  appProps?: T
): Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  optionsOrRoot: HTMLElement | AppContextOptions,
  appProps = {} as T
): Kaioken.VNode {
  let opts, root
  if (optionsOrRoot instanceof HTMLElement) {
    root = optionsOrRoot
  } else {
    opts = optionsOrRoot
    root = optionsOrRoot.root
  }

  ctx.current = new AppContext(opts)
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
  const c = new AppContext()
  ctx.current = c
  const prev = renderMode.current
  renderMode.current = "string"
  const n = el instanceof Function ? createElement(el, elProps) : el
  c.rootNode = n as VNode
  const res = renderToString_internal(n, undefined, elProps)
  renderMode.current = prev
  contexts.splice(contexts.indexOf(c), 1)
  return res
}

function renderToString_internal<T extends Record<string, unknown>>(
  el: JSX.Element,
  parent?: VNode | undefined,
  elProps = {} as T
): string {
  if (el === null) return ""
  if (el === undefined) return ""
  if (typeof el === "boolean") return ""
  if (typeof el === "string") return el
  if (typeof el === "number") return el.toString()
  if (typeof el === "function")
    return renderToString_internal(createElement(el, elProps))
  if (el instanceof Array)
    return el.map((el) => renderToString_internal(el, el.props)).join("")

  el.parent = parent
  nodeToCtxMap.set(el, ctx.current)
  const props = el.props ?? {}
  const children = props.children ?? []
  const type = el.type
  if (type === et.text) return props.nodeValue ?? ""
  if (type === et.fragment)
    return children.map((c) => renderToString_internal(c, el, props)).join("")

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
        ? `>${children.map((c) => renderToString_internal(c, el, c.props)).join("")}</${type}>`
        : "/>")
    )
  }

  node.current = el
  if (Component.isCtor(type)) {
    const instance = new (type as unknown as {
      new (props: Record<string, unknown>): Component
    })(props)
    return renderToString_internal(instance.render(), el, props)
  }

  return renderToString_internal(type(props), el, props)
}
