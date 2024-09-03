import type { Component } from "./component"
import { createElement } from "./element.js"

export { jsx }

function jsx(
  type: string | Function | typeof Component,
  { children, ...props } = {} as { children?: Kaioken.VNode[] }
) {
  if (!children) return createElement(type, props)
  return createElement(type, props, children)
}
