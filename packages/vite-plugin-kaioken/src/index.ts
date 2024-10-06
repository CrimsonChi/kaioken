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
  const tsOrJsRegex = /\.(ts|js)$/
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
      if (!tsxOrJsxRegex.test(ctx.file) && !tsOrJsRegex.test(ctx.file)) return
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
      if (!tsxOrJsxRegex.test(id) && !tsOrJsRegex.test(id)) return { code }
      const ast = this.parse(code)
      try {
        const hotVars = findHotVars(ast.body as AstNode[], id)
        if (hotVars.length === 0) return { code }
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
    ${hotVars.map((name) => `"${name}": ${name}`).join(",\n")}
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
  callee?: AstNode & { name: string }
  exported?: AstNode & { name: string }
  consequent?: AstNode | AstNode[]
  alternate?: AstNode
  local?: AstNode & { name: string }
  imported?: AstNode & { name: string }
  source?: AstNode & { value: string }
  value?: unknown
}

const createFilePathComment = (
  formatter: FilePathFormatter,
  filePath: string,
  line = 0
) => `// [kaioken_devtools]:${formatter(filePath, line)}`

function createAliasBuilder(source: string, name: string) {
  const aliases = new Set<string>()

  const nodeContainsAliasCall = (n: AstNode) =>
    isNodeCallExpressionOfFunctionAlias(n, aliases)

  const addAliases = (node: AstNode) => {
    if (!node.source || node.source.value !== source) return
    const specifiers = node.specifiers || []
    for (let i = 0; i < specifiers.length; i++) {
      const specifier = specifiers[i]
      if (
        specifier.imported &&
        specifier.imported.name === name &&
        !!specifier.local
      ) {
        aliases.add(specifier.local.name)
      }
    }
  }
  return {
    addAliases,
    getAliases: () => aliases,
    nodeContainsAliasCall,
  }
}

function findHotVars(nodes: AstNode[], _id: string): string[] {
  const hotVarNames = new Set<string>()

  const { addAliases: addCreateStoreAliases, nodeContainsAliasCall: isStore } =
    createAliasBuilder("kaioken", "createStore")
  const { addAliases: addSignalAliases, nodeContainsAliasCall: isSignal } =
    createAliasBuilder("kaioken", "signal")
  const { addAliases: addComputedAliases, nodeContainsAliasCall: isComputed } =
    createAliasBuilder("kaioken", "computed")

  for (const node of nodes) {
    if (node.type === "ImportDeclaration") {
      addCreateStoreAliases(node)
      addSignalAliases(node)
      addComputedAliases(node)
      continue
    }

    if (findNode(node, isNodeCreateElementExpression)) {
      addHotVarNames(node, hotVarNames)
      continue
    }

    if (findNode(node, isStore)) {
      addHotVarNames(node, hotVarNames)
      continue
    }
    if (findNode(node, isSignal)) {
      addHotVarNames(node, hotVarNames)
      continue
    }

    if (findNode(node, isComputed)) {
      addHotVarNames(node, hotVarNames)
      continue
    }
  }
  return Array.from(hotVarNames)
}

function addHotVarNames(node: AstNode, names: Set<string>) {
  if (node.id?.name) {
    names.add(node.id.name)
  } else if (node.declaration) {
    if (node.declaration.id) {
      names.add(node.declaration.id.name)
    } else if (node.declaration.declarations) {
      for (const dec of node.declaration.declarations) {
        const name = dec.id?.name
        if (!name) continue
        names.add(name)
      }
    }
  } else if (node.declarations) {
    for (const dec of node.declarations) {
      const name = dec.id?.name
      if (!name) continue
      names.add(name)
    }
  }
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
      findNode(node, isNodeCreateElementExpression) &&
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
        if (findNode(body, isNodeCreateElementExpression)) {
          insertToFunctionDeclarationBody(body)
        }
      } else if (dec?.type === "VariableDeclaration") {
        const declarations = dec.declarations
        if (!declarations) continue
        for (const dec of declarations) {
          if (dec.init && findNode(dec.init, isNodeCreateElementExpression)) {
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

function isNodeCallExpressionOfFunctionAlias(
  node: AstNode,
  aliases: Set<string>
): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    aliases.has(node.callee.name)
  )
}

function findNode(
  node: AstNode,
  predicate: (node: AstNode) => boolean
): boolean {
  if (predicate(node)) return true

  if (node.body && Array.isArray(node.body)) {
    for (const child of node.body) {
      if (findNode(child, predicate)) return true
    }
  } else if (node.body) {
    if (findNode(node.body, predicate)) return true
  }

  if (node.consequent && Array.isArray(node.consequent)) {
    for (const child of node.consequent) {
      if (findNode(child, predicate)) return true
    }
  } else if (node.consequent) {
    if (findNode(node.consequent, predicate)) return true
  }

  if (
    (node.init && findNode(node.init, predicate)) ||
    (node.argument && findNode(node.argument, predicate)) ||
    (node.arguments && node.arguments.some((c) => findNode(c, predicate))) ||
    (node.alternate && findNode(node.alternate, predicate)) ||
    (node.callee && findNode(node.callee, predicate)) ||
    (node.declaration && findNode(node.declaration, predicate)) ||
    (node.declarations &&
      node.declarations.some((c) => findNode(c, predicate))) ||
    (node.cases && node.cases.some((c) => findNode(c, predicate)))
  ) {
    return true
  }

  return false
}
