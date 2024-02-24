import { createElement } from "./index.js"

type Rec = Record<string, unknown>

function _arePropsEqual(prevProps: Rec, nextProps: Rec) {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps)
}

export function memo<Props extends Record<string, unknown>>(
  fn: (props: Props) => JSX.Element | null,
  arePropsEqual: (
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>
  ) => boolean = _arePropsEqual
) {
  let node: Kaioken.VNode
  let oldProps = {}

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
