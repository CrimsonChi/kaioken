import type { AppContext } from "kaioken"

export function isDevtoolsApp(app: AppContext) {
  return app.name === "kaioken.devtools"
}

export function getNodeName(node: Kaioken.VNode) {
  return (
    (node.type as any).displayName ??
    ((node.type as Function).name || "Anonymous Function")
  )
}

export function searchMatchesItem(terms: string[], item: string) {
  const toLower = item.toLowerCase()
  return terms.every((term) => toLower.includes(term))
}

export function isComponent(
  node: Kaioken.VNode
): node is Kaioken.VNode & { type: Function } {
  return typeof node.type === "function" && node.type.name !== "fragment"
}

export function nodeContainsComponent(node: Kaioken.VNode) {
  let stack = [node]
  while (stack.length) {
    const n = stack.pop()!
    if (isComponent(n)) {
      return true
    }
    n.child && stack.push(n.child)
    n.sibling && stack.push(n.sibling)
  }
  return false
}

export const nodeContainsNode = (
  currentNode: Kaioken.VNode,
  componentNode: Kaioken.VNode
) => {
  const stack = [componentNode.parent]

  while (stack.length) {
    const node = stack.pop()
    //  console.log('currentNode',node)

    if (currentNode === node) {
      return true
    }

    if (node?.parent) stack.push(node.parent)
  }

  return false
}
