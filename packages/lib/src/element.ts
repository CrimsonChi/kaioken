import { fragmentSymbol } from "./constants.js"
import { ctx, nodeToCtxMap } from "./globals.js"
import { isValidElementKeyProp, isValidElementRefProp } from "./props.js"

export function createElement<T extends Kaioken.VNode["type"]>(
  type: T,
  props: null | Record<string, unknown> = null,
  ...children: unknown[]
): Kaioken.VNode {
  if ((type as any) === fragment) {
    return fragment({ children })
  }
  const node: Kaioken.VNode = {
    type,
    index: 0,
    depth: 0,
    props: {},
  }

  if (props !== null) {
    const { key, ref, ...rest } = props
    if (isValidElementKeyProp(key)) node.props.key = key.toString()
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

export function fragment({ children }: { children: unknown[] }): Kaioken.VNode {
  return createElement(fragmentSymbol, null, ...children)
}
