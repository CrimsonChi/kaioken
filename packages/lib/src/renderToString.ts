import { ctx, node, nodeToCtxMap, renderMode } from "./globals.js"
import { AppContext } from "./appContext.js"
import { createElement, Fragment } from "./element.js"
import {
  isVNode,
  encodeHtmlEntities,
  propsToElementAttributes,
  selfClosingTags,
} from "./utils.js"
import { Signal } from "./signal.js"
import {
  contextProviderSymbol,
  ELEMENT_TYPE,
  fragmentSymbol,
} from "./constants.js"
import { assertValidElementProps } from "./props.js"

export function renderToString<T extends Record<string, unknown>>(
  el: (props: T) => JSX.Element,
  elProps = {} as T
) {
  const prev = renderMode.current
  renderMode.current = "string"
  const prevCtx = ctx.current
  const c = (ctx.current = new AppContext(el, elProps))
  const appNode = createElement(el, elProps)
  c.rootNode = Fragment({ children: [appNode] })
  c.rootNode.depth = 0
  appNode.depth = 1
  const res = renderToString_internal(appNode, c.rootNode, 0)
  renderMode.current = prev
  ctx.current = prevCtx
  return res
}

function renderToString_internal(
  el: unknown,
  parent: Kaioken.VNode,
  idx: number
): string {
  if (el === null) return ""
  if (el === undefined) return ""
  if (typeof el === "boolean") return ""
  if (typeof el === "string") return encodeHtmlEntities(el)
  if (typeof el === "number" || typeof el === "bigint") return el.toString()
  if (el instanceof Array) {
    return el.map((c, i) => renderToString_internal(c, parent, i)).join("")
  }
  if (Signal.isSignal(el)) return String(el.peek())
  if (!isVNode(el)) return String(el)
  el.parent = parent
  el.depth = parent!.depth + 1
  el.index = idx
  const props = el.props ?? {}
  const children = props.children
  const type = el.type
  if (type === ELEMENT_TYPE.text)
    return encodeHtmlEntities(props.nodeValue ?? "")
  if (type === fragmentSymbol || type === contextProviderSymbol) {
    if (!Array.isArray(children))
      return renderToString_internal(children, el, idx)
    return children.map((c, i) => renderToString_internal(c, el, i)).join("")
  }

  if (typeof type !== "string") {
    nodeToCtxMap.set(el, ctx.current)
    node.current = el
    const res = type(props)
    node.current = undefined
    return renderToString_internal(res, el, idx)
  }

  assertValidElementProps(el)
  const attrs = propsToElementAttributes(props)
  const inner =
    "innerHTML" in props
      ? Signal.isSignal(props.innerHTML)
        ? props.innerHTML.peek()
        : props.innerHTML
      : Array.isArray(children)
        ? children.map((c, i) => renderToString_internal(c, el, i)).join("")
        : renderToString_internal(children, el, 0)

  const isSelfClosing = selfClosingTags.includes(type)
  return `<${type}${attrs.length ? " " + attrs : ""}${isSelfClosing ? "/>" : `>${inner}</${type}>`}`
}
