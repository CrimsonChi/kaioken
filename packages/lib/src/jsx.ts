import { createElement } from "./index.js"
import type { Component } from "./component"
import type { VNode } from "./types"

export { jsx }

function jsx(
  type: string | Function | typeof Component,
  { children, ...props } = {} as {
    children?: VNode | unknown | (VNode | unknown)[]
  }
) {
  return createElement(type, props, children)
}
