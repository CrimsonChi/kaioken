import type { Component } from "./component"
import { elementTypes } from "./constants.js"
import { ctx } from "./globals.js"

export function createElement<T extends string | Function | typeof Component>(
  type: T,
  props: null | Record<string, unknown> = null,
  ...children: unknown[]
): Kaioken.VNode {
  const _children =
    children.length === 1 ? children[0] : children.length > 1 ? children : null
  const node: Kaioken.VNode = {
    ctx: ctx.current,
    type,
    index: 0,
    props: _children !== null ? { ...props, children: _children } : props ?? {},
  }
  return node
}

export function fragment({
  children,
  ...rest
}: { children: unknown } & Record<string, unknown>) {
  const c = Array.isArray(children) ? children : [children]
  return createElement(elementTypes.fragment, rest, ...c)
}
