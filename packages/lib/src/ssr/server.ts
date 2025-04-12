import { Readable } from "node:stream"
import { createElement, Fragment } from "../index.js"
import { AppContext } from "../appContext.js"
import { renderMode, ctx, node, nodeToCtxMap } from "../globals.js"
import {
  isVNode,
  encodeHtmlEntities,
  propsToElementAttributes,
  selfClosingTags,
  tryFindThrowHandler,
} from "../utils.js"
import { Signal } from "../signals/base.js"
import { $CONTEXT_PROVIDER, ELEMENT_TYPE, $FRAGMENT } from "../constants.js"
import { assertValidElementProps } from "../props.js"

type ServerRenderState = {
  stream: Readable
  ctx: AppContext
  promises: Promise<any>[]
}

export function renderToReadableStream<T extends Record<string, unknown>>(
  appFunc: (props: T) => JSX.Element,
  appProps = {} as T
): Readable {
  const prev = renderMode.current
  renderMode.current = "stream"
  const state: ServerRenderState = {
    stream: new Readable({
      read: () => {}, // not needed since we're using `stream.push()`
      objectMode: true,
    }),
    ctx: new AppContext<any>(appFunc, appProps),
    promises: [],
  }
  const prevCtx = ctx.current
  ctx.current = state.ctx
  const appNode = createElement(appFunc, appProps)
  state.ctx.rootNode = Fragment({ children: [appNode] })
  state.ctx.rootNode.depth = 0
  appNode.depth = 1
  renderToStream_internal(state, appNode, state.ctx.rootNode, 0)
  Promise.all(state.promises).then(() => {
    renderMode.current = prev
    ctx.current = prevCtx
    state.stream.push(null)
  })

  return state.stream
}

function renderToStream_internal(
  state: ServerRenderState,
  el: unknown,
  parent: Kaioken.VNode,
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
  el.depth = parent.depth + 1
  el.index = idx
  const props = el.props ?? {}
  const children = props.children
  const type = el.type
  if (type === ELEMENT_TYPE.text) {
    state.stream.push(encodeHtmlEntities(props.nodeValue ?? ""))
    return
  }
  if (type === $FRAGMENT || type === $CONTEXT_PROVIDER) {
    if (!Array.isArray(children))
      return renderToStream_internal(state, children, el, idx)
    return children.forEach((c, i) => renderToStream_internal(state, c, el, i))
  }

  if (typeof type !== "string") {
    nodeToCtxMap.set(el, state.ctx)
    node.current = el
    try {
      const res = type(props)
      return renderToStream_internal(state, res, el, 0)
    } catch (error) {
      const handlerNode = tryFindThrowHandler(el, error)
      if (handlerNode === null)
        return console.error("failed to find handler", error)

      const { promise, resolve } = Promise.withResolvers<void>()
      let _id: string | undefined
      // @ts-ignore
      let _value: unknown
      handlerNode.throwHandler.onServerThrow(error, {
        createSuspendedContentBoundary(id, value, fallback) {
          _id = id
          _value = value
          state.promises.push(promise)
          state.stream.push(`<!--suspense:0:${_id}-->`)
          renderToStream_internal(state, fallback, handlerNode, 0)
          state.stream.push(`<!--suspense:1:${_id}-->`)
        },
        retry() {
          if (_id === undefined)
            throw new Error(
              "[kaioken]: retry() called before createSuspendedContentBoundary()"
            )
          state.stream.push(`<k-suspense hidden>`)
          renderToStream_internal(state, el, parent, 0)
          state.stream.push(`</k-suspense>`)
          state.stream.push(
            `<script>window.__kaioken_resolveSuspense("${_id}", ${JSON.stringify(
              _value
            )});</script>`
          )
          resolve()
        },
      })
      return
    } finally {
      node.current = undefined
    }
  }

  assertValidElementProps(el)
  const attrs = propsToElementAttributes(props)
  const isSelfClosing = selfClosingTags.includes(type)
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
        children.forEach((c, i) => renderToStream_internal(state, c, el, i))
      } else {
        renderToStream_internal(state, children, el, 0)
      }
    }

    state.stream.push(`</${type}>`)
  }
}
