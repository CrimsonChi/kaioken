import { elementFreezeSymbol } from "./constants.js"
import { createElement } from "./index.js"

type Rec = Record<string, unknown>

function _arePropsEqual(prevProps: Rec, nextProps: Rec) {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps)
}

export function memo<Props extends Record<string, unknown>>(
  fn: (props: Props) => JSX.Element,
  arePropsEqual: (
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>
  ) => boolean = _arePropsEqual
): (props: Props) => JSX.Element {
  let node: Kaioken.VNode
  let oldProps = {}

  return (props: Props) => {
    if (node && arePropsEqual(oldProps, props)) {
      return Object.assign(node, { [elementFreezeSymbol]: true })
    }
    oldProps = props
    if (!node) {
      node = createElement(fn, props)
    } else {
      Object.assign(node.props, props)
    }
    console.log("props changed")
    return Object.assign(node, { [elementFreezeSymbol]: false })
  }
}
