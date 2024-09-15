import { createElement } from "./element.js"
import { isVNode } from "./utils.js"

export function cloneVNode(child: Kaioken.VNode): Kaioken.VNode {
  const children = child.props.children
  let clonedChildren: unknown
  if (isVNode(children)) {
    clonedChildren = cloneVNode(children)
  } else if (Array.isArray(children)) {
    clonedChildren = children.map((c) => (isVNode(c) ? cloneVNode(c) : c))
  }

  return createElement(child.type, { ...child.props, children: clonedChildren })
}
