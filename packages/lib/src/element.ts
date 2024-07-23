import type { Component } from "./component"
import { elementTypes } from "./constants.js"
import { ctx } from "./globals.js"

export function createElement<T extends string | Function | typeof Component>(
  type: T,
  props: null | Record<string, unknown> = null,
  ...children: unknown[]
): Kaioken.VNode {
  const node: Kaioken.VNode = {
    ctx: ctx.current,
    type,
    index: 0,
    props: children.length ? { ...props, children } : props ?? {},
  }
  return node
}

export function fragment({
  children,
  ...rest
}: { children: unknown[] } & Record<string, unknown>) {
  return createElement(elementTypes.fragment, rest, ...children)
}
