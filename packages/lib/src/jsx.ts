import type { Component } from "./component"
import { createElement } from "./index.js"

export { jsx }

function jsx(
  type: string | Function | typeof Component,
  { children, ...props } = {} as { children?: Kaioken.VNode[] }
) {
  return createElement(type, props, children)
}
