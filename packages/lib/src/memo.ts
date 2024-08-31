import { createElement } from "./element.js"
import { useRef } from "./hooks/useRef.js"

function _arePropsEqual<T extends Record<string, unknown>>(
  prevProps: T,
  nextProps: T
) {
  return Object.keys(prevProps).every(
    ([key]) => prevProps[key] === nextProps[key]
  )
}

export function memo<Props extends Record<string, unknown>>(
  fn: (props: Props) => JSX.Element,
  arePropsEqual: (
    prevProps: Props,
    nextProps: Props
  ) => boolean = _arePropsEqual
): (props: Props) => JSX.Element {
  const _fn = function (props: Props) {
    const prevProps = useRef<Props | null>(null)
    const node = useRef<Kaioken.VNode | null>(null)

    if (
      node.current &&
      prevProps.current &&
      arePropsEqual(prevProps.current, props)
    ) {
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
  _fn.displayName = "Kaioken.memo"
  return _fn
}
