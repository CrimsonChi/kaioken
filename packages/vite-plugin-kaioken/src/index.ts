import type { ESBuildOptions, ModuleNode, Plugin, UserConfig } from "vite"
import devtoolsLinkScript from "kaioken-devtools-host"
import devtoolsUiScript from "kaioken-devtools-client"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const defaultEsBuildOptions: ESBuildOptions = {
  jsxInject: `import * as kaioken from "kaioken"`,
  jsx: "transform",
  jsxFactory: "kaioken.createElement",
  jsxFragment: "kaioken.fragment",
  loader: "tsx",
  include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
}

export interface KaiokenPluginOptions {
  devtools?: boolean
}

export default function (
  opts: KaiokenPluginOptions = {
    devtools: true,
  }
): Plugin {
  let isProduction = false
  let isBuild = false

  let kaiokenModuleId = require
    .resolve("kaioken", {
      paths: [process.cwd()],
    })
    .replace(/\\/g, "/")
  if (kaiokenModuleId.endsWith("/lib/index.js")) {
    kaiokenModuleId = kaiokenModuleId.replace(
      "/lib/index.js",
      "/lib/dist/index.js"
    )
  }

  return {
    name: "vite-plugin-kaioken",
    config(config) {
      return {
        ...config,
        esbuild: {
          ...defaultEsBuildOptions,
          ...config.esbuild,
        },
      } as UserConfig
    },
    configResolved(config) {
      isProduction = config.isProduction
      isBuild = config.command === "build"
    },
    configureServer(server) {
      if (isProduction || isBuild || !opts.devtools) return
      server.middlewares.use("/__devtools__", (_, res) => {
        res.end(devtoolsUiScript)
      })
    },
    handleHotUpdate(ctx) {
      if (isProduction || isBuild) return
      if (!/\.(tsx|jsx)$/.test(ctx.file)) return
      const module = ctx.modules.find((m) => m.file === ctx.file)
      if (!module || !module.isSelfAccepting) return

      const importers: ModuleNode[] = []
      const addImporters = (module: ModuleNode) => {
        if (
          module.file &&
          /\.(tsx|jsx)$/.test(module.file) &&
          !importers.includes(module) &&
          module.isSelfAccepting
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
      if (
        opts.devtools &&
        (id === kaiokenModuleId || id.includes("/kaioken.js?"))
      ) {
        code += devtoolsLinkScript
        return { code }
      }

      if (!/\.(tsx|jsx)$/.test(id)) return { code }
      const ast = this.parse(code)
      try {
        const componentNames = findExportedComponentNames(ast.body as AstNode[])
        if (componentNames.length > 0) {
          code = `
import {contexts} from "kaioken/dist/globals.js";\n
import {applyRecursive} from "kaioken/dist/utils.js";\n
${code}\n
if (import.meta.hot) {
  function handleUpdate(newModule, name, funcRef) {
    if (newModule[name]) {
      contexts.forEach((ctx) => {
        applyRecursive(ctx.rootNode, (node) => {
          if (node.type === funcRef) {
            node.type = newModule[name];
            if (node.prev) {
              node.prev.type = newModule[name];
            }
            ctx.requestUpdate(node);
          }
        })
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
  declarations?: AstNode[]
  id?: AstNodeId
  init?: AstNode
  object?: AstNodeId
  property?: AstNodeId
  argument?: AstNode
  arguments?: AstNode[]
  specifiers?: AstNode[]
  callee?: AstNode
  exported?: AstNode & { name: string }
  consequent?: AstNode
  alternate?: AstNode
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
      if (!dec.id) {
        // handle 'export const MyComponent = () => {}'
        const declarations = dec.declarations
        if (!declarations) continue
        for (const dec of declarations) {
          const name = dec.id?.name
          if (!name) continue
          if (componentNames.includes(name)) continue
          if (dec.init && nodeContainsCreateElement(dec.init)) {
            componentNames.push(name)
          }
        }
      }

      const name = dec.id?.name // handle 'export function MyComponent() {}'
      if (!name) continue

      if (nodeContainsCreateElement(dec)) {
        componentNames.push(name)
      }
    } else {
      if (nodeContainsCreateElement(node)) {
        const name = node.id?.name
        if (
          name &&
          exportNames.includes(name) &&
          !componentNames.includes(name)
        ) {
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
  } else if (
    (node.body && nodeContainsCreateElement(node.body)) ||
    (node.argument && nodeContainsCreateElement(node.argument)) ||
    (node.consequent && nodeContainsCreateElement(node.consequent)) ||
    (node.alternate && nodeContainsCreateElement(node.alternate)) ||
    (node.callee && nodeContainsCreateElement(node.callee)) ||
    (node.arguments &&
      node.arguments.some((arg) => nodeContainsCreateElement(arg))) ||
    (node.declarations &&
      node.declarations.some((decl) => nodeContainsCreateElement(decl)))
  ) {
    return true
  }

  return false
}
