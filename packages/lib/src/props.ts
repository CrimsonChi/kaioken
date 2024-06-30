export function assertValidElementProps(vNode: Kaioken.VNode) {
  if (vNode.props.children?.length && vNode.props.innerHTML) {
    throw new Error(
      "[kaioken]: Cannot use both children and innerHTML on an element"
    )
  }
}
