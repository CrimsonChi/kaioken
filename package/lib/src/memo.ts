import type { Rec, VNode } from "./types"
import { createElement } from "./index.js"

function _arePropsEqual(prevProps: any, nextProps: any) {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps)
}

export function memo<Props extends Rec>(
  fn: (props: Props) => JSX.Element | null,
  arePropsEqual: (prevProps: any, nextProps: any) => boolean = _arePropsEqual
) {
  let node: VNode
  let oldProps: Rec = {}

  return (props: Props) => {
    if (!node) {
      node = createElement(fn, props)
      oldProps = props
      return node
    }
    if (arePropsEqual(oldProps, props)) {
      return node
    }
    node = createElement(fn, props)
    oldProps = props
    return node
  }
}
