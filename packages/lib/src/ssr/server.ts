import { Readable } from "node:stream"
import { Fragment } from "../element.js"
import { AppContext, createAppContext } from "../appContext.js"
import { renderMode, node } from "../globals.js"
import {
  isVNode,
  encodeHtmlEntities,
  propsToElementAttributes,
  isExoticType,
} from "../utils.js"
import { Signal } from "../signals/base.js"
import { $HYDRATION_BOUNDARY, voidElements } from "../constants.js"
import { assertValidElementProps } from "../props.js"
import { HYDRATION_BOUNDARY_MARKER } from "./hydrationBoundary.js"
import { __DEV__ } from "../env.js"

type RequestState = {
  stream: Readable
  ctx: AppContext
}

export function renderToReadableStream<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  appProps = {} as T
): Readable {
  const prev = renderMode.current
  renderMode.current = "stream"
  const state: RequestState = {
    stream: new Readable(),
    ctx: createAppContext(appFunc, appProps, { rootType: Fragment }),
  }
  renderToStream_internal(state, state.ctx.rootNode, null, 0)
  state.stream.push(null)
  renderMode.current = prev

  return state.stream
}

function renderToStream_internal(
  state: RequestState,
  el: unknown,
  parent: Kiru.VNode | null,
  idx: number
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
  if (el instanceof Array) {
    el.forEach((c, i) => renderToStream_internal(state, c, parent, i))
    return
  }
  if (Signal.isSignal(el)) {
    state.stream.push(String(el.peek()))
    return
  }
  if (!isVNode(el)) {
    state.stream.push(String(el))
    return
  }
  el.parent = parent
  el.depth = (parent?.depth ?? -1) + 1
  el.index = idx
  const props = el.props ?? {}
  const children = props.children
  const type = el.type
  if (type === "#text") {
    state.stream.push(encodeHtmlEntities(props.nodeValue ?? ""))
    return
  }
  if (isExoticType(type)) {
    if (type === $HYDRATION_BOUNDARY) {
      state.stream.push(`<!--${HYDRATION_BOUNDARY_MARKER}-->`)
      renderToStream_internal(state, children, el, idx)
      state.stream.push(`<!--/${HYDRATION_BOUNDARY_MARKER}-->`)
      return
    }
    return renderToStream_internal(state, children, el, idx)
  }

  if (typeof type !== "string") {
    node.current = el
    const res = type(props)
    node.current = null
    return renderToStream_internal(state, res, parent, idx)
  }

  if (__DEV__) {
    assertValidElementProps(el)
  }
  const attrs = propsToElementAttributes(props)
  state.stream.push(`<${type}${attrs.length ? ` ${attrs}` : ""}>`)

  if (!voidElements.has(type)) {
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
        children.forEach((c, i) => renderToStream_internal(state, c, el, i))
      } else {
        renderToStream_internal(state, children, el, 0)
      }
    }

    state.stream.push(`</${type}>`)
  }
}
