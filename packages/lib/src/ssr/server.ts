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
import { PROMISE_STATUS, WrappedPromise } from "../suspense.js"

type ServerRenderState = {
  stream: Readable
  ctx: AppContext
  promises: Map<string, WrappedPromise<any>[]>
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
    promises: new Map(),
  }
  const prevCtx = ctx.current
  ctx.current = state.ctx
  const appNode = createElement(appFunc, appProps)
  state.ctx.rootNode = Fragment({ children: [appNode] })
  state.ctx.rootNode.depth = 0
  appNode.depth = 1
  renderToStream_internal(state, appNode, state.ctx.rootNode, 0)
  Promise.all(state.promises.values().flatMap((p) => p)).then(() => {
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
      state.ctx.hookIndex = 0
      const res = type(props)
      if (!el.suspended) {
        return renderToStream_internal(state, res, el, 0)
      }

      const promises = state.promises.get(el.suspenseId!)!.map((p) => p.value)
      console.log("SUSPENSE_FIN_PRE", el.suspenseId, promises)

      state.stream.push(`<k-suspense hidden>`)
      renderToStream_internal(state, res, el, 0)
      state.stream.push(`</k-suspense>`)
      state.stream.push(
        `<script>window.__kaioken_resolveSuspense("${
          el.suspenseId
        }", ${JSON.stringify(promises)});</script>`
      )
      console.log("SUSPENSE_FIN_POST", el.suspenseId)
      return
    } catch (error) {
      const handlerNode = tryFindThrowHandler(el, error)
      if (handlerNode === null) throw error

      handlerNode.throwHandler.onServerThrow(error, {
        createSuspendedContentBoundary(suspenseId, value, fallback) {
          el.suspenseId = suspenseId
          const didPushFallback = state.promises.has(suspenseId)
          const promises = state.promises.get(suspenseId) ?? []
          const asWrapped = value as WrappedPromise<any>
          console.log(
            "createSuspendedContentBoundary",
            suspenseId,
            asWrapped.key
          )
          if (promises.find((p) => p.key === asWrapped.key)) return

          state.promises.set(suspenseId, [...promises, asWrapped])
          if (didPushFallback) return

          console.log("push fallback", asWrapped.key)

          state.stream.push(`<!--suspense:0:${suspenseId}-->`)
          renderToStream_internal(state, fallback, handlerNode, 0)
          state.stream.push(`<!--suspense:1:${suspenseId}-->`)
        },
        retry() {
          renderToStream_internal(state, el, parent, 0)
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
