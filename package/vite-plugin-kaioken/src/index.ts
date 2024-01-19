import type { Plugin } from "vite"

export default function (): Plugin {
  let isProduction = false
  let isBuild = false

  return {
    name: "vite-plugin-kaioken",
    configResolved(config) {
      isProduction = config.isProduction
      isBuild = config.command === "build"
    },
    transform(code, id) {
      if (isProduction || isBuild) return
      if (!/\.(tsx|jsx)$/.test(id)) return
      const ast = this.parse(code) as AstNode
      try {
        const exports = findExports(ast.body as AstNode[])
        if (exports.length > 0) {
          code = `
import {g} from "kaioken/src/globalState";\n
${code}\n
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      ${exports
        .map(
          (name) => `
      if (newModule.${name}) {
        g.findNodesByType(${name}).forEach((node) => {
          node.type = newModule.${name}
          g.requestUpdate(node)
        })
      }`
        )
        .join("")}
    }
  })
}`
        }
      } catch (error) {
        console.error(error)
      }
      return { code }
    },
  }
}

interface AstNodeId {
  type: string
  name: string
}

interface AstNode {
  end: number
  start: number
  type: string
  body?: AstNode | AstNode[]
  declaration?: AstNode
  id?: AstNodeId
  object?: AstNodeId
  property?: AstNodeId
  argument?: AstNode
  arguments?: AstNode[]
  callee?: AstNode
}

function findExports(nodes: AstNode[]): string[] {
  const exports: string[] = []
  for (const node of nodes) {
    if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    ) {
      const dec = node.declaration as AstNode
      if (!/^[A-Z]/.test(dec.id?.name ?? "")) continue

      if (nodeContainsCreateElement(dec)) {
        exports.push(dec.id?.name ?? "")
      }
    }
  }
  return exports
}

function nodeContainsCreateElement(node: AstNode): boolean {
  if (node.type === "MemberExpression") {
    if (
      node.object?.type === "Identifier" &&
      node.object.name === "kaioken" &&
      node.property?.type === "Identifier" &&
      node.property.name === "createElement"
    ) {
      return true
    }
  }
  if (node.body && Array.isArray(node.body)) {
    for (const child of node.body) {
      if (nodeContainsCreateElement(child)) return true
    }
  } else if (node.body && nodeContainsCreateElement(node.body)) {
    return true
  } else if (node.argument && nodeContainsCreateElement(node.argument)) {
    return true
  }
  if (node.arguments) {
    for (const arg of node.arguments) {
      if (nodeContainsCreateElement(arg)) return true
    }
  }
  if (node.callee) {
    return nodeContainsCreateElement(node.callee)
  }
  return false
}
