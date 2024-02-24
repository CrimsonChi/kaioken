import { createElement } from "./index.js"
import type { Component } from "./component"

export { jsx }

type VNode = Kaioken.VNode

function jsx(
  type: string | Function | typeof Component,
  { children, ...props } = {} as {
    children?: VNode | unknown | (VNode | unknown)[]
  }
) {
  return createElement(type, props, children)
}
