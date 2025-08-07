import { createElement } from "./element.js"
import { isVNode } from "./utils.js"

export function cloneVNode(vNode: Kiru.VNode): Kiru.VNode {
  const children = vNode.props.children
  let clonedChildren: unknown
  if (isVNode(children)) {
    clonedChildren = cloneVNode(children)
  } else if (Array.isArray(children)) {
    clonedChildren = children.map((c) => (isVNode(c) ? cloneVNode(c) : c))
  }

  return createElement(vNode.type, { ...vNode.props, children: clonedChildren })
}
