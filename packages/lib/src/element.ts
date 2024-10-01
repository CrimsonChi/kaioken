import { fragmentSymbol } from "./constants.js"
import { isValidElementKeyProp, isValidElementRefProp } from "./props.js"

export function createElement<T extends Kaioken.VNode["type"]>(
  type: T,
  props: null | Record<string, unknown> = null,
  ...children: unknown[]
): Kaioken.VNode {
  if ((type as any) === Fragment) {
    return Fragment({ children: children as any, ...props })
  }
  const node: Kaioken.VNode = {
    type,
    flags: 0,
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

  return node
}

export function Fragment({
  children,
  key,
}: {
  children: JSX.Children
  key?: JSX.ElementKey
}): Kaioken.VNode {
  return createElement(fragmentSymbol, key ? { key } : null, children)
}
