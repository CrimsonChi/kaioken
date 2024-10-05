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
    const vNode = useRef<Kaioken.VNode | null>(null)
    const thisNode = useVNode()
    thisNode.props = props
    thisNode.depth = (thisNode.parent?.depth || 0) + 1

    if (
      vNode.current &&
      prevProps.current &&
      arePropsEqual(prevProps.current, props)
    ) {
      vNode.current.props = props
      prevProps.current = props
      vNode.current.frozen = true
      return vNode.current
    }

    prevProps.current = props

    if (!vNode.current) {
      vNode.current = createElement(fn, props)
    } else {
      Object.assign(vNode.current.props, props)
    }
    vNode.current.frozen = false
    return vNode.current
  }
  memo.displayName = "Kaioken.memo"
  return memo
}
