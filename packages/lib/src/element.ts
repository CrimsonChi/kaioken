import type { Component } from "./component"
import { ELEMENT_TYPE } from "./constants.js"
import { ctx, nodeToCtxMap } from "./globals.js"
import { isValidElementKeyProp, isValidElementRefProp } from "./props.js"

export function createElement<T extends string | Function | typeof Component>(
  type: T,
  props: null | Record<string, unknown> = null,
  ...children: unknown[]
): Kaioken.VNode {
  const node: Kaioken.VNode = {
    type,
    index: 0,
    props: {},
  }

  if (props !== null) {
    const { key, ref, ...rest } = props
    if (isValidElementKeyProp(key)) node.props.key = key
    if (isValidElementRefProp(ref)) node.props.ref = ref
    Object.assign(node.props, rest)
  }

  const _children =
    children.length === 1 ? children[0] : children.length > 1 ? children : null
  if (_children !== null) {
    node.props.children = _children
  }

  nodeToCtxMap.set(node, ctx.current)
  return node
}

export function fragment({
  children,
  ...rest
}: { children: unknown } & Record<string, unknown>) {
  const c = Array.isArray(children) ? children : [children]
  return createElement(ELEMENT_TYPE.fragment, rest, ...c)
}
