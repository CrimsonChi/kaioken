import { createElement } from "./element.js"
import { useRef } from "./hooks/useRef.js"
import { useVNode } from "./hooks/utils.js"

function _arePropsEqual<T extends Record<string, unknown>>(
  prevProps: T,
  nextProps: T
) {
  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])
  for (const key of keys) {
    if (prevProps[key] !== nextProps[key]) {
      return false
    }
  }
  return true
}

export function memo<T extends Record<string, unknown> = {}>(
  fn: Kaioken.FC<T>,
  arePropsEqual: (prevProps: T, nextProps: T) => boolean = _arePropsEqual
): (props: T) => JSX.Element {
  const memo = function (props: T) {
    const prevProps = useRef<T | null>(null)
    const node = useRef<Kaioken.VNode | null>(null)
    const thisNode = useVNode()
    thisNode.props = props
    thisNode.depth = (thisNode.parent?.depth || 0) + 1

    if (
      node.current &&
      prevProps.current &&
      arePropsEqual(prevProps.current, props)
    ) {
      node.current.props = props
      prevProps.current = props
      node.current.frozen = true
      return node.current
    }

    prevProps.current = props

    if (!node.current) {
      node.current = createElement(fn, props)
    } else {
      Object.assign(node.current.props, props)
    }
    node.current.frozen = false
    return node.current
  }
  memo.displayName = "Kaioken.memo"
  return memo
}
