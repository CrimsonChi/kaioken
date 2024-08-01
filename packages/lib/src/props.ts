export function assertValidElementProps(vNode: Kaioken.VNode) {
  if ("children" in vNode.props && vNode.props.innerHTML) {
    throw new Error(
      "[kaioken]: Cannot use both children and innerHTML on an element"
    )
  }
}
