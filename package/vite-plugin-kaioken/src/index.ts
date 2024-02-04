import type { ModuleNode, Plugin } from "vite"

export default function (): Plugin {
  let isProduction = false
  let isBuild = false

  return {
    name: "vite-plugin-kaioken",
    configResolved(config) {
      isProduction = config.isProduction
      isBuild = config.command === "build"
    },
    handleHotUpdate(ctx) {
      if (isProduction || isBuild) return
      if (!/\.(tsx|jsx)$/.test(ctx.file)) return
      const module = ctx.modules.find((m) => m.file === ctx.file)
      if (!module) return

      const importers: ModuleNode[] = []
      const addImporters = (module: ModuleNode) => {
        if (
          module.file &&
          /\.(tsx|jsx)$/.test(module.file) &&
          !importers.includes(module)
        ) {
          importers.push(module)
          module.importers.forEach(addImporters)
        }
      }
      module.importers.forEach(addImporters)
      return [module, ...importers]
    },
    transform(code, id) {
      if (isProduction || isBuild) return
      if (!/\.(tsx|jsx)$/.test(id)) return
      const ast = this.parse(code) as AstNode
      try {
        const componentNames = findExportedComponentNames(ast.body as AstNode[])
        if (componentNames.length > 0) {
          code = `
import {ctx} from "kaioken/dist/globalContext";\n
${code}\n
if (import.meta.hot) {
  function handleUpdate(newModule, name, funcRef) {
    if (newModule[name]) {
        ctx.applyRecursive((node) => {
          if (node.type === funcRef) {
            node.type = newModule[name];
            if (node.prev) {
              node.prev.type = newModule[name];
            }
            ctx.requestUpdate(node);
          }
        })
      }
  }


  import.meta.hot.accept((newModule) => {
    if (newModule) {
      ${componentNames
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

function findExportedComponentNames(nodes: AstNode[]): string[] {
  const exportNames: string[] = []
  const componentNames: string[] = []
  for (const node of nodes) {
    if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    ) {
      const dec = node.declaration as AstNode
      if (!dec) {
        if (node.specifiers && node.specifiers.length) {
          for (const spec of node.specifiers) {
            if (spec.local?.name) exportNames.push(spec.local.name)
          }
        }
        continue
      }
      const name = dec.id?.name
      if (!name || !/^[A-Z]/.test(name)) continue

      if (nodeContainsCreateElement(dec)) {
        componentNames.push(name)
      }
    } else {
      if (nodeContainsCreateElement(node)) {
        const name = node.id?.name
        if (name && exportNames.includes(name)) {
          componentNames.push(name)
        }
      }
    }
  }
  return componentNames
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
