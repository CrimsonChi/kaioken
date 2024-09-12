import { Readable } from "node:stream"
import { createElement } from "../index.js"
import { AppContext } from "../appContext.js"
import { renderMode, ctx, node } from "../globals.js"

import {
  encodeHtmlEntities,
  isVNode,
  propFilters,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
  selfClosingTags,
} from "../utils.js"

import { Signal } from "../signal.js"
import {
  contextProviderSymbol,
  ELEMENT_TYPE as et,
  fragmentSymbol,
} from "../constants.js"
import { assertValidElementProps } from "../props.js"

type RequestState = {
  stream: Readable
  ctx: AppContext
}

export function renderToReadableStream<T extends Record<string, unknown>>(
  el: (props: T) => JSX.Element,
  elProps = {} as T
): Readable {
  const prev = renderMode.current
  renderMode.current = "stream"
  const state: RequestState = {
    stream: new Readable(),
    ctx: new AppContext<any>(el, elProps),
  }
  const prevCtx = ctx.current
  ctx.current = state.ctx
  state.ctx.rootNode = createElement(el, elProps)
  renderToStream_internal(state, state.ctx.rootNode, undefined, elProps)

  state.stream.push(null)
  renderMode.current = prev
  ctx.current = prevCtx

  return state.stream
}

function renderToStream_internal<T extends Record<string, unknown>>(
  state: RequestState,
  el: unknown,
  parent?: Kaioken.VNode | undefined,
  elProps = {} as T
): void {
  if (el === null) return
  if (el === undefined) return
  if (typeof el === "boolean") return
  if (typeof el === "string") {
    state.stream.push(encodeHtmlEntities(el))
    return
  }
  if (typeof el === "number" || typeof el === "bigint") {
    state.stream.push(el.toString())
    return
  }
  if (typeof el === "function") {
    renderToStream_internal(state, createElement(el, elProps), parent)
    return
  }
  if (el instanceof Array) {
    el.forEach((c) => renderToStream_internal(state, c, parent))
    return
  }
  if (Signal.isSignal(el)) {
    renderToStream_internal(state, el.peek(), parent)
    return
  }
  if (!isVNode(el)) {
    state.stream.push(String(el))
    return
  }

  el.parent = parent
  const props = el.props ?? {}
  const children = props.children
  const type = el.type
  if (type === et.text) {
    state.stream.push(encodeHtmlEntities(props.nodeValue ?? ""))
    return
  }
  if (type === fragmentSymbol || type === contextProviderSymbol) {
    if (!Array.isArray(children))
      return renderToStream_internal(state, children, el)
    return children.forEach((c) => renderToStream_internal(state, c, el))
  }

  if (typeof type !== "string") {
    node.current = el
    const res = type(props)
    node.current = undefined
    return renderToStream_internal(state, res, parent, props)
  }

  assertValidElementProps(el)
  const isSelfClosing = selfClosingTags.includes(type)
  const attrs = Object.keys(props)
    .filter(propFilters.isProperty)
    .map(
      (k) => `${propToHtmlAttr(k)}="${propValueToHtmlAttrValue(k, props[k])}"`
    )
    .join(" ")

  state.stream.push(
    `<${type}${attrs.length ? " " + attrs : ""}${isSelfClosing ? "/>" : ">"}`
  )

  if (!isSelfClosing) {
    if ("innerHTML" in props) {
      state.stream.push(
        String(
          Signal.isSignal(props.innerHTML)
            ? props.innerHTML.peek()
            : props.innerHTML
        )
      )
    } else {
      if (Array.isArray(children)) {
        children.forEach((c) => renderToStream_internal(state, c, el))
      } else {
        renderToStream_internal(state, children, el)
      }
    }

    state.stream.push(`</${type}>`)
  }
}
