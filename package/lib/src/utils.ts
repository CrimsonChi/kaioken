import type { Rec, VNode } from "./types"

export function isVNode(node: any): node is VNode {
  return node && node.type !== undefined && node.props !== undefined
}

export function isValidChild(child: unknown) {
  return child !== null && child !== undefined && child !== false
}

export const propFilters = {
  internalProps: ["children", "ref"],
  isEvent: (key: string) => key.startsWith("on"),
  isProperty: (key: string) =>
    !propFilters.internalProps.includes(key) && !propFilters.isEvent(key),
  isNew: (prev: Rec, next: Rec) => (key: string) => prev[key] !== next[key],
  isGone: (_prev: Rec, next: Rec) => (key: string) => !(key in next),
}
