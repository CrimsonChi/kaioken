import { createElement } from "./index.js"

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
  let node: Kaioken.VNode
  let oldProps = {} as Props
  return Object.assign(
    (props: Props) => {
      if (node && arePropsEqual(oldProps, props)) {
        node.frozen = true
        return node
      }
      oldProps = props
      if (!node) {
        node = createElement(fn, props)
      } else {
        Object.assign(node.props, props)
      }
      node.frozen = false
      return node
    },
    { displayName: "Kaioken.memo" }
  )
}
