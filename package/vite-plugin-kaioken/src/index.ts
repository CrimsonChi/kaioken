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
import {g} from "kaioken/dist/globalState";\n
${code}\n
if (import.meta.hot) {
  function handleUpdate(newModule, name, funcRef) {
    if (newModule[name]) {
        const fp = import.meta.url.split("?")[0];
        const nodes = g.findNodes((n) => {
          return n.type === funcRef
        });
        console.log("found nodes for funcRef", funcRef, nodes);
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          node.type = newModule[name];
          g.requestUpdate(node);
        }
      }
  }


  import.meta.hot.accept((newModule) => {
    if (newModule) {
      ${exports
        .map((name) => `handleUpdate(newModule, "${name}", ${name})`)
        .join(";")}
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
  start: number
  end: number
  type: string
  body?: AstNode | AstNode[]
  declaration?: AstNode
  id?: AstNodeId
  object?: AstNodeId
  property?: AstNodeId
  argument?: AstNode
  arguments?: AstNode[]
  specifiers?: AstNode[]
  callee?: AstNode
  exported?: AstNode & { name: string }
  local?: AstNode & { name: string }
}

function findExports(nodes: AstNode[]): string[] {
  const potentialExports: string[] = []
  const exports: string[] = []
  for (const node of nodes) {
    if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    ) {
      const dec = node.declaration as AstNode
      if (!dec) {
        if (node.specifiers && node.specifiers.length) {
          for (const spec of node.specifiers) {
            if (spec.local?.name) potentialExports.push(spec.local.name)
          }
        }
        continue
      }
      const name = dec.id?.name
      if (!name || !/^[A-Z]/.test(name)) continue

      if (nodeContainsCreateElement(dec)) {
        exports.push(name)
      }
    } else {
      if (nodeContainsCreateElement(node)) {
        const name = node.id?.name
        if (name && potentialExports.includes(name)) {
          exports.push(name)
        }
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
