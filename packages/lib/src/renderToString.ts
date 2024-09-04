import { ctx, node, renderMode } from "./globals.js"
import { AppContext } from "./appContext.js"
import { createElement } from "./element.js"
import {
  encodeHtmlEntities,
  isVNode,
  propFilters,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
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
  c.rootNode = createElement(el, elProps)
  const res = renderToString_internal(c.rootNode, undefined, elProps)
  renderMode.current = prev
  ctx.current = prevCtx
  return res
}

function renderToString_internal<T extends Record<string, unknown>>(
  el: unknown,
  parent?: Kaioken.VNode | undefined,
  elProps = {} as T
): string {
  if (el === null) return ""
  if (el === undefined) return ""
  if (typeof el === "boolean") return ""
  if (typeof el === "string") return encodeHtmlEntities(el)
  if (typeof el === "number" || typeof el === "bigint") return el.toString()
  if (typeof el === "function")
    return renderToString_internal(createElement(el, elProps), parent)
  if (el instanceof Array) {
    return el.map((c) => renderToString_internal(c, parent)).join("")
  }
  if (Signal.isSignal(el)) return renderToString_internal(el.value, parent)
  if (!isVNode(el)) return String(el)

  el.parent = parent
  const props = el.props ?? {}
  const children = props.children
  const type = el.type
  if (type === ELEMENT_TYPE.text)
    return encodeHtmlEntities(props.nodeValue ?? "")
  if (type === fragmentSymbol || type === contextProviderSymbol) {
    if (!Array.isArray(children)) return renderToString_internal(children, el)
    return children.map((c) => renderToString_internal(c, el, props)).join("")
  }

  if (typeof type !== "string") {
    node.current = el
    const res = type(props)
    node.current = undefined
    return renderToString_internal(res, el, props)
  }

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
      : Array.isArray(children)
        ? children.map((c) => renderToString_internal(c, el)).join("")
        : renderToString_internal(children, el)

  return `<${type}${attrs.length ? " " + attrs : ""}${isSelfClosing ? "/>" : `>${inner}</${type}>`}`
}
