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
import { assertValidElementProps } from "./props.js"
import { Signal } from "./signal.js"

export type * from "./types"
export * from "./hooks/index.js"
export * from "./component.js"
export * from "./context.js"
export * from "./appContext.js"
export * from "./memo.js"
export * from "./portal.js"
export * from "./router.js"
export { signal } from "./signal.js"
export * from "./store.js"
export * from "./transition.js"

export { mount, createElement, fragment, renderToString }

export function getProps<T>() {
  return node.current?.props as T
}
// @ts-ignore
export function onMounted(fn: () => void) {}
// @ts-ignore
export function onBeforeUnmounted(fn: () => void) {}

if ("window" in globalThis) {
  window.__kaioken = window.__kaioken ?? new KaiokenGlobalContext()
}

type VNode = Kaioken.VNode

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  options: AppContextOptions,
  appProps?: T
): Promise<AppContext>

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  root: HTMLElement,
  appProps?: T
): Promise<AppContext>

function mount<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  optionsOrRoot: HTMLElement | AppContextOptions,
  appProps = {} as T
): Promise<AppContext> {
  let root: HTMLElement, opts: AppContextOptions | undefined
  if (optionsOrRoot instanceof HTMLElement) {
    root = optionsOrRoot
    opts = { root }
  } else {
    opts = optionsOrRoot
    root = optionsOrRoot.root
  }
  ctx.current = new AppContext(appFunc, appProps, opts)
  return ctx.current.mount()
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
  el: (props: T) => JSX.Element,
  elProps = {} as T
) {
  const prev = renderMode.current
  renderMode.current = "string"
  const c = (ctx.current = new AppContext(el, elProps))
  c.rootNode = el instanceof Function ? createElement(el, elProps) : el
  const res = renderToString_internal(c.rootNode, undefined, elProps)
  contexts.splice(contexts.indexOf(c), 1)
  renderMode.current = prev
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
  if (typeof el === "string") return encodeHtmlEntities(el)
  if (typeof el === "number") return encodeHtmlEntities(el.toString())
  if (typeof el === "function")
    return renderToString_internal(createElement(el, elProps))
  if (el instanceof Array) {
    let s = ""
    for (let i = 0; i < el.length; i++) {
      s += renderToString_internal(el[i], parent, elProps)
    }
    return s
  }
  if (Signal.isSignal(el)) return encodeHtmlEntities(el.value.toString())

  el.parent = parent
  nodeToCtxMap.set(el, ctx.current)
  const props = el.props ?? {}
  const children = props.children ?? []
  const type = el.type
  if (type === et.text) return encodeHtmlEntities(props.nodeValue ?? "")
  if (type === et.fragment)
    return children.map((c) => renderToString_internal(c, el, props)).join("")

  if (typeof type === "string") {
    assertValidElementProps(el)
    const isSelfClosing = selfClosingTags.includes(type)
    const attrs = Object.keys(props)
      .filter(propFilters.isProperty)
      .map(
        (k) => `${propToHtmlAttr(k)}="${propValueToHtmlAttrValue(k, props[k])}"`
      )
      .join(" ")

    const inner =
      "innerHTML" in props
        ? Signal.isSignal(props.innerHTML)
          ? props.innerHTML.value
          : props.innerHTML
        : children.map((c) => renderToString_internal(c, el, c.props)).join("")

    return `<${type} ${attrs}${isSelfClosing ? "/>" : `>${inner}</${type}>`}`
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

function encodeHtmlEntities(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#47;")
}
