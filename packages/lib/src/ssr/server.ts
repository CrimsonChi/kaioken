import { Readable } from "node:stream"
import { Component, createElement } from "../index.js"
import { AppContext } from "../appContext.js"
import { renderMode, ctx, node, contexts, nodeToCtxMap } from "../globals.js"

import {
  encodeHtmlEntities,
  isVNode,
  propFilters,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
  selfClosingTags,
} from "../utils.js"

import { Signal } from "../signal.js"
import { elementTypes as et } from "../constants.js"
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
  ctx.current = state.ctx
  state.ctx.rootNode = el instanceof Function ? createElement(el, elProps) : el
  renderToStream_internal(state, state.ctx.rootNode, undefined, elProps)

  state.stream.push(null)
  contexts.splice(contexts.indexOf(state.ctx), 1)
  renderMode.current = prev

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
  switch (typeof el) {
    case "boolean":
      return
    case "string":
      state.stream.push(encodeHtmlEntities(el))
      return
    case "number":
      state.stream.push(encodeHtmlEntities(el.toString()))
      return
    case "function":
      return renderToStream_internal(state, createElement(el, elProps))
  }

  if (el instanceof Array) {
    return el.forEach((c) => renderToStream_internal(state, c, parent, elProps))
  }
  if (Signal.isSignal(el)) {
    state.stream.push(encodeHtmlEntities(el.value.toString()))
    return
  }

  if (!isVNode(el)) {
    state.stream.push(String(el))
    return
  }

  el.parent = parent
  nodeToCtxMap.set(el, ctx.current)
  const props = el.props ?? {}
  const children = props.children ?? []
  const type = el.type
  if (type === et.text) {
    state.stream.push(encodeHtmlEntities(props.nodeValue ?? ""))
    return
  }
  if (type === et.fragment) {
    return children.forEach((c) => renderToStream_internal(state, c, el, props))
  }

  if (typeof type !== "string") {
    node.current = el
    if (Component.isCtor(type)) {
      el.instance = new (type as unknown as {
        new (props: Record<string, unknown>): Component
      })(props)
      return renderToStream_internal(state, el.instance.render(), el, props)
    }

    return renderToStream_internal(state, type(props), el, props)
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
            ? props.innerHTML.value
            : props.innerHTML
        )
      )
    } else {
      children.forEach((c) => renderToStream_internal(state, c, el))
    }

    state.stream.push(`</${type}>`)
  }
}
