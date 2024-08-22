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
