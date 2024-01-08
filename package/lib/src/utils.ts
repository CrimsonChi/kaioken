import type { VNode } from "./types"

export function isVNode(node: any): node is VNode {
  return node && node.type !== undefined && node.props !== undefined
}
