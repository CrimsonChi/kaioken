import type { ESBuildOptions, ModuleNode, Plugin, UserConfig } from "vite"
import devtoolsLinkScript from "kaioken-devtools-host"
import devtoolsUiScript from "kaioken-devtools-client"

export const defaultEsBuildOptions: ESBuildOptions = {
  jsxInject: `import * as kaioken from "kaioken"`,
  jsx: "transform",
  jsxFactory: "kaioken.createElement",
  jsxFragment: "kaioken.Fragment",
  loader: "tsx",
  include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
}

type FilePathFormatter = (path: string, line: number) => string

export interface KaiokenPluginOptions {
  devtools?: boolean
  /**
   * Formats the link displayed in devtools to the component's source code
   * @param path the path to the file that contains the component on disk
   * @param line the component's line number
   * @returns {string} the formatted link
   * @default (path, line) => `vscode://file/${path}:${line}`
   */
  formatFileLink?: FilePathFormatter
}

const vscodeFilePathFormatter = (path: string, line: number) =>
  `vscode://file/${path}:${line}`

export default function kaioken(
  opts: KaiokenPluginOptions = {
    devtools: true,
    formatFileLink: vscodeFilePathFormatter,
  }
): Plugin {
  const tsxOrJsxRegex = /\.(tsx|jsx)$/
  let isProduction = false
  let isBuild = false

  const fileLinkFormatter = opts.formatFileLink || vscodeFilePathFormatter

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
    transformIndexHtml(html) {
      if (isProduction || isBuild || !opts.devtools) return
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: "/__devtools__.js",
            },
          },
        ],
      }
    },
    configResolved(config) {
      isProduction = config.isProduction
      isBuild = config.command === "build"
    },
    configureServer(server) {
      if (isProduction || isBuild || !opts.devtools) return
      server.middlewares.use("/__devtools__.js", (_, res) => {
        res.setHeader("Content-Type", "application/javascript")
        res.end(devtoolsLinkScript, "utf-8")
      })
      server.middlewares.use("/__devtools__", (_, res) => {
        res.end(devtoolsUiScript)
      })
    },
    handleHotUpdate(ctx) {
      if (isProduction || isBuild) return
      if (!tsxOrJsxRegex.test(ctx.file)) return
      const module = ctx.modules.find((m) => m.file === ctx.file)
      if (!module) return []

      const importers: ModuleNode[] = []
      const addImporters = (module: ModuleNode) => {
        if (
          module.file &&
          tsxOrJsxRegex.test(module.file) &&
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
      if (!tsxOrJsxRegex.test(id)) return { code }
      const ast = this.parse(code)
      try {
        const componentNames = findComponentNames(ast.body as AstNode[])
        if (componentNames.length === 0) return { code }
        code = transformIncludeFilePath(
          fileLinkFormatter,
          ast.body as AstNode[],
          code,
          id
        )
        code += `
if (import.meta.hot && "window" in globalThis) {
  import.meta.hot.accept();
  window.__kaioken.HMRContext?.register("${id}", {
    ${componentNames.map((name) => `"${name}": ${name}`).join(",\n")}
  });
}`
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
  type: "FunctionDeclaration" | "BlockStatement" | (string & {})
  body?: AstNode | AstNode[]
  declaration?: AstNode
  declarations?: AstNode[]
  id?: AstNodeId
  init?: AstNode
  object?: AstNodeId
  property?: AstNodeId
  properties?: AstNode[]
  argument?: AstNode
  arguments?: AstNode[]
  specifiers?: AstNode[]
  cases?: AstNode[]
  callee?: AstNode
  exported?: AstNode & { name: string }
  consequent?: AstNode | AstNode[]
  alternate?: AstNode
  local?: AstNode & { name: string }
  value?: unknown
}

const createFilePathComment = (
  formatter: FilePathFormatter,
  filePath: string,
  line = 0
) => `// [kaioken_devtools]:${formatter(filePath, line)}`

function findComponentNames(nodes: AstNode[]): string[] {
  const components: string[] = []
  for (const node of nodes) {
    if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    ) {
      const dec = node.declaration as AstNode
      if (!dec) {
        if (node.specifiers && node.specifiers.length) {
          for (const spec of node.specifiers) {
            if (spec.local?.name) {
              components.push(spec.local.name)
            }
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
          if (components.find((c) => c === name)) continue
          if (dec.init && nodeContainsCreateElement(dec.init)) {
            components.push(name)
          }
        }
      }

      const name = dec.id?.name // handle 'export function MyComponent() {}'
      if (!name) continue

      if (nodeContainsCreateElement(dec)) {
        components.push(name)
      }
    } else {
      if (nodeContainsCreateElement(node)) {
        const name = node.id?.name
        if (!name) continue
        if (components.find((c) => c === name)) continue
        components.push(name)
      }
    }
  }
  return components
}

function transformIncludeFilePath(
  linkFormatter: FilePathFormatter,
  nodes: AstNode[],
  code: string,
  id: string
) {
  let offset = 0

  const insertToFunctionDeclarationBody = (
    body: AstNode & { body: AstNode[] }
  ) => {
    const commentText = createFilePathComment(linkFormatter, id)
    const insertPosition = body.start + 1
    code =
      code.slice(0, insertPosition + offset) +
      commentText +
      code.slice(insertPosition + offset)

    offset += commentText.length
  }
  // for each function that contains `kaioken.createElement`, inject the file path as a comment node inside of the function body
  for (const node of nodes) {
    if (
      nodeContainsCreateElement(node) &&
      node.type === "FunctionDeclaration" &&
      node.body &&
      !Array.isArray(node.body)
    ) {
      const body = node.body as AstNode & { body: AstNode[] }
      insertToFunctionDeclarationBody(body)
    } else if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    ) {
      const dec = node.declaration
      if (dec?.type === "FunctionDeclaration") {
        const body = dec.body as AstNode & { body: AstNode[] }
        if (nodeContainsCreateElement(body)) {
          insertToFunctionDeclarationBody(body)
        }
      } else if (dec?.type === "VariableDeclaration") {
        const declarations = dec.declarations
        if (!declarations) continue
        for (const dec of declarations) {
          if (dec.init && nodeContainsCreateElement(dec.init)) {
            const body = dec.init as AstNode & { body: AstNode[] }
            if (
              body.type === "ArrowFunctionExpression" ||
              body.type === "FunctionExpression"
            ) {
              insertToFunctionDeclarationBody(
                body.body! as AstNode & { body: AstNode[] }
              )
            }
          }
        }
      }
    }
  }
  return code
}

function isNodeCreateElementExpression(node: AstNode): boolean {
  return (
    node.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    node.object.name === "kaioken" &&
    node.property?.type === "Identifier" &&
    node.property.name === "createElement"
  )
}

function nodeContainsCreateElement(node: AstNode): boolean {
  if (isNodeCreateElementExpression(node)) return true
  if (node.body && Array.isArray(node.body)) {
    for (const child of node.body) {
      if (nodeContainsCreateElement(child)) return true
    }
  } else if (
    (node.consequent
      ? Array.isArray(node.consequent)
        ? node.consequent.some(nodeContainsCreateElement)
        : nodeContainsCreateElement(node.consequent)
      : false) ||
    (node.body && nodeContainsCreateElement(node.body)) ||
    (node.argument && nodeContainsCreateElement(node.argument)) ||
    (node.alternate && nodeContainsCreateElement(node.alternate)) ||
    (node.callee && nodeContainsCreateElement(node.callee)) ||
    (node.declaration && nodeContainsCreateElement(node.declaration)) ||
    (node.cases && node.cases.some(nodeContainsCreateElement)) ||
    (node.arguments && node.arguments.some(nodeContainsCreateElement)) ||
    (node.declarations && node.declarations.some(nodeContainsCreateElement))
  ) {
    return true
  }

  return false
}
