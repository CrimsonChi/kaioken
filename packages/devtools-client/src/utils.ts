import { AppContext } from "kaioken"

export function isDevtoolsApp(app: AppContext) {
  return app.name === "kaioken.devtools"
}

export function getNodeName(node: Kaioken.VNode) {
  return (
    (node.type as any).displayName ??
    ((node.type as Function).name || "Anonymous Function")
  )
}
