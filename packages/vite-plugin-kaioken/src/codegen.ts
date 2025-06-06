import type { ProgramNode } from "rollup"
import { FileLinkFormatter } from "./types"
import MagicString from "magic-string"
import fs from "node:fs"
import path from "node:path"

import * as AST from "./ast"
type AstNode = AST.AstNode

const UNNAMED_WATCH_PREAMBLE = `\n
if (import.meta.hot && "window" in globalThis) {
  window.__kaioken.HMRContext?.signals.registerNextWatch();
}
`
export function injectHMRContextPreamble(
  code: MagicString,
  ast: ProgramNode,
  fileLinkFormatter: FileLinkFormatter,
  filePath: string,
  isVirtualModule: boolean
) {
  try {
    createUnnamedWatchInserts(code, ast.body as AstNode[])

    const hotVars = findHotVars(ast.body as AstNode[], filePath)
    if (hotVars.size === 0 && !code.hasChanged()) return

    code.prepend(`
if (import.meta.hot && "window" in globalThis) {
  window.__kaioken.HMRContext?.prepare("${filePath}");
}
`)

    const componentNamesToHookArgs = getComponentHookArgs(
      ast.body as AstNode[],
      code.original,
      filePath
    )

    code.append(`
if (import.meta.hot && "window" in globalThis) {
  import.meta.hot.accept();
  ${createHMRRegistrationBlurb(
    hotVars,
    componentNamesToHookArgs,
    fileLinkFormatter,
    filePath,
    isVirtualModule
  )}
}
`)
  } catch (error) {
    console.error(error)
  }
}

function findFirstParentOfType(stack: AstNode[], type: AstNode["type"]) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].type === type) {
      return stack[i]
    }
  }
  return null
}

function findLastConsecutiveParentOfType(
  stack: AstNode[],
  type: AstNode["type"]
) {
  let last: AstNode | null = null
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].type !== type) {
      return last
    }
    last = stack[i]
  }
  return last
}

export function prepareHydrationBoundaries(
  code: MagicString,
  ast: ProgramNode,
  filePath: string
): {
  extraModules: Record<string, string>
} {
  const CWD = process.cwd().replace(/\\/g, "/")
  const folderPath = filePath
    .replace(/\\/g, "/")
    .split("/")
    .slice(0, -1)
    .join("/")
  const modulePrefix = filePath
    .replace("+", "")
    .split(".")
    .slice(0, -1)
    .join("")
    .replace(CWD, "")
    .split("/")
    .filter(Boolean)
    .join("_")
  const extraModules: Record<string, string> = {}
  const bodyNodes = ast.body as AstNode[]
  const hydrationBoundaryAliasHandler = createAliasHandler(
    "HydrationBoundary",
    "kaioken/ssr"
  )
  const importNodes: AstNode[] = []

  for (const node of ast.body as AstNode[]) {
    if (node.type === "ImportDeclaration") {
      if (hydrationBoundaryAliasHandler.addAliases(node)) {
        continue
      }
      importNodes.push(node)
      continue
    }
    if (!isComponent(node, bodyNodes)) continue

    const componentName = findNodeName(node)
    if (componentName === null) {
      console.error(
        "[vite-plugin-kaioken]: unable to prepare hydration boundaries (failed to find component name)",
        node.type,
        node.start
      )
      continue
    }
    const componentBodyNodes = findFunctionBodyNodes(
      node,
      componentName,
      bodyNodes
    )
    type ExpressionEntry = {
      node: AstNode
      property: AstNode | null
    }
    let currentBoundary: {
      id: string
      node: AstNode
      deps: {
        imports: Set<AstNode>
        expressions: Array<ExpressionEntry>
      }
      hasJsxChildren: boolean
    } | null = null

    type BlockScope = Map<string, AstNode>
    const globalVars = new Map<string, AstNode>(
      importNodes.reduce<Array<[string, AstNode]>>((acc, item) => {
        const entries: Array<[string, AstNode]> = item.specifiers!.map((s) => [
          s.local!.name,
          s,
        ])
        return [...acc, ...entries]
      }, [])
    )
    const blockScopes: BlockScope[] = [
      // global scope
      globalVars,
      // function scope
      new Map(globalVars),
    ]

    const enableLog = false && filePath.includes("index/+Page.tsx")
    const log = enableLog ? console.log : () => {}

    let index = 0
    const fnExprs: AstNode[] = []
    componentBodyNodes?.forEach((node) => {
      AST.walk(node, {
        // ReturnStatement: (n) => {
        //   log(JSON.stringify(n, null, 2))
        // },
        // capture variables encountered outside of boundary scopes
        VariableDeclarator: (n) => {
          if (currentBoundary) return
          blockScopes[blockScopes.length - 1].set(n.id?.name!, n)
        },
        BlockStatement: () => {
          if (currentBoundary) return
          const parentScope = blockScopes[blockScopes.length - 1]
          blockScopes.push(new Map(parentScope))
          return () => blockScopes.pop()
        },
        // find jsx props, hoist non-literal values
        ObjectExpression: (n, ctx) => {
          const boundary = currentBoundary
          if (!boundary) return
          const parent = ctx.stack[ctx.stack.length - 1]

          const isParentJSX =
            parent.type === "CallExpression" && parent.callee?.name === "_jsx"
          if (!isParentJSX) return
          // prevent operating on boundary props
          if (parent === currentBoundary?.node) return

          const nonLiteralProperties =
            n.properties?.filter(
              (p) =>
                typeof p.value === "object" &&
                (p.value as AstNode).type !== "Literal"
            ) ?? []

          nonLiteralProperties.forEach((p) => {
            boundary.deps.expressions.push({
              node: (p.value as AstNode)!,
              property: p,
            })
          })
          ctx.exitBranch() // prevent touching anything further here
        },
        MemberExpression: (n) => {
          if (!currentBoundary || !n.object?.name) return
          const parentScope = blockScopes[blockScopes.length - 1]
          const variableFromParentScope = parentScope.get(n.object.name)
          if (variableFromParentScope) {
            currentBoundary.deps.expressions.push({
              node: n,
              property: null,
            })
          }
        },
        BinaryExpression: (n, ctx) => {
          if (!currentBoundary) return
          const isHoistRequired = AST.findNode(
            n,
            (node) =>
              node !== n &&
              node.type !== "Literal" &&
              node.type !== "BinaryExpression"
          )
          if (!isHoistRequired) return
          // TODO: if there are only literals, do nothing
          currentBoundary.deps.expressions.push({
            node: n,
            property: null,
          })
          ctx.exitBranch()
        },
        ["*"]: (n, ctx) => {
          // ensure we've entered a JSX block inside a boundary
          if (!currentBoundary?.hasJsxChildren) return

          switch (n.type) {
            case "ArrowFunctionExpression":
            case "FunctionExpression": {
              fnExprs.push(n)
              return () => fnExprs.pop()
            }
            case "Identifier": {
              // skip identifiers inside function expressions, the fn expression will be hoisted
              if (fnExprs.length) return
              // skip jsx identifiers
              if (n.name === "_jsx") return

              log("identifier", n.name)

              const parentCallExpression = findFirstParentOfType(
                ctx.stack,
                "CallExpression"
              )

              if (
                parentCallExpression &&
                parentCallExpression.callee?.name !== "_jsx"
              ) {
                // add the call expr instead of the identifier
                currentBoundary.deps.expressions.push({
                  node: parentCallExpression,
                  property: null,
                })
                return
              }

              if (ctx.stack[ctx.stack.length - 1].type === "MemberExpression") {
                const exprRoot = findLastConsecutiveParentOfType(
                  ctx.stack,
                  "MemberExpression"
                )
                if (exprRoot?.type !== "MemberExpression") return
                currentBoundary.deps.expressions.push({
                  node: exprRoot,
                  property: null,
                })
                return
              }

              const importNode = importNodes.find((importNode) =>
                importNode.specifiers?.some((s) => s.local?.name === n.name)
              )
              if (importNode) {
                currentBoundary.deps.imports.add(importNode)
              } else {
                currentBoundary.deps.expressions.push({
                  node: n,
                  property: null,
                })
              }
              return
            }
          }
          return
        },
        CallExpression: (n) => {
          if (n.callee?.type !== "Identifier" || n.callee.name !== "_jsx") {
            return
          }
          if (currentBoundary) {
            currentBoundary.hasJsxChildren = true
            return
          }

          const [nodeType, _, ...children] = n.arguments!

          if (
            nodeType.type === "Identifier" &&
            nodeType.name &&
            hydrationBoundaryAliasHandler.aliases.has(nodeType.name)
          ) {
            const idx = index++
            const boundary = (currentBoundary = {
              id: `@boundaries/${modulePrefix}/${componentName}_${idx}`,
              node: n,
              deps: {
                imports: new Set<AstNode>(),
                expressions: [] as ExpressionEntry[],
              },
              hasJsxChildren: false,
            })
            return () => {
              if (!boundary.hasJsxChildren) return
              log(
                "boundary - finalization",
                boundary.deps.expressions,
                boundary.deps.imports
              )
              /**
               * TODO: we need to scan childArgs to find jsx expressions and hoist them
               * into props for the children loader
               */
              // hoist props

              // create virtual modules
              const childExprStart = Math.min(...children.map((n) => n.start!))
              const childExprEnd = Math.max(...children.map((n) => n.end!))
              const childrenExpr = new MagicString(
                code.original.substring(childExprStart, childExprEnd)
              )
              log("childrenExpr: before", childrenExpr.toString())

              transformChildExpression: {
                for (let i = 0; i < boundary.deps.expressions.length; i++) {
                  const { node: expr, property } = boundary.deps.expressions[i]
                  const start = expr.start! - childExprStart
                  const end = expr.end! - childExprStart
                  if (!property) {
                    childrenExpr.update(start, end, `_props[${i}]`)
                    continue
                  }
                  if (!property.shorthand) {
                    // just replace rhs
                    childrenExpr.update(start, end, `_props[${i}]`)
                    continue
                  }
                  childrenExpr.appendLeft(end, `: _props[${i}]`)
                }
              }
              log("childrenExpr:after", childrenExpr.toString())

              let moduleCode = `\nimport {createElement as _jsx, Fragment as _jsxFragment} from "kaioken";\n`
              copyImports: {
                for (const importedIdentifier of boundary.deps.imports) {
                  const importPath = importedIdentifier.source!.value
                  const isRelative =
                    importPath[0] === "." || importPath[0] === "/"

                  const defaultSpecifier = importedIdentifier.specifiers!.find(
                    (s) => s.type === "ImportDefaultSpecifier"
                  )
                  const nonDefaults = importedIdentifier.specifiers!.filter(
                    (s) => s !== defaultSpecifier
                  )

                  let importStr = "import "

                  if (defaultSpecifier) {
                    importStr += defaultSpecifier.local?.name
                  }

                  if (nonDefaults.length) {
                    if (defaultSpecifier) {
                      importStr += ", "
                    }
                    const names = nonDefaults
                      .map((s) => s.local?.name)
                      .join(", ")
                    importStr += `{ ${names} }`
                  }

                  if (isRelative) {
                    importStr += ` from "${path
                      .resolve(folderPath, importPath)
                      .replace(/\\/g, "/")}";`
                  } else {
                    importStr += ` from "${importPath}";`
                  }

                  moduleCode += `${importStr}\n`
                }
              }

              addModules: {
                moduleCode += `\n\nexport default function BoundaryChildren({_props}) {
                  return _jsx(_jsxFragment, null, ${childrenExpr})
                  }`
                const boundaryChildrenName = `BoundaryChildren_${componentName}_${idx}`
                code.prepend(
                  `\nimport ${boundaryChildrenName} from "${
                    boundary.id + "_loader"
                  }";\n`
                )
                const props = boundary.deps.expressions
                  .map((expr) =>
                    code.original.slice(expr.node.start!, expr.node.end!)
                  )
                  .join(",\n")

                code.update(
                  childExprStart,
                  childExprEnd,
                  `_jsx(${boundaryChildrenName}, { _props: [${props}] })`
                )

                extraModules[boundary.id] = moduleCode
                extraModules[
                  boundary.id + "_loader"
                ] = `import {lazy} from "kaioken";
const BoundaryChildrenLoader = lazy(() => import("${boundary.id}"));
export default BoundaryChildrenLoader;`
                currentBoundary = null
              }
            }
          }
          return
        },
      })
    })
  }
  return { extraModules }
}

type HotVarDesc = {
  type: string
  name: string
}

function createHMRRegistrationBlurb(
  hotVars: Set<HotVarDesc>,
  componentHookArgs: Record<string, HookToArgs[]>,
  fileLinkFormatter: FileLinkFormatter,
  filePath: string,
  isVirtualModule: boolean
) {
  let entries: string[] = []
  if (isVirtualModule) {
    entries = Array.from(hotVars).map(({ name, type }) => {
      if (type !== "component") {
        return `    ${name}: {
      type: "${type}",
      value: ${name}
    }`
      }

      return `    ${name}: {
        type: "component",
        value: ${name},
        hooks: [],
      }`
    })
  } else {
    const src = fs.readFileSync(filePath, "utf-8")
    entries = Array.from(hotVars).map(({ name, type }) => {
      const line = findHotVarLineInSrc(src, name)
      if (type !== "component") {
        return `    ${name}: {
      type: "${type}",
      value: ${name},
      link: "${fileLinkFormatter(filePath, line)}"
    }`
      }
      if (!componentHookArgs[name]) {
        console.error(
          "[vite-plugin-kaioken]: failed to parse component hooks",
          name
        )
      }
      const args = componentHookArgs[name].map(([name, args]) => {
        return `{ name: "${name}", args: "${args}" }`
      })
      return `    ${name}: {
      type: "component",
      value: ${name},
      hooks: [${args.join(",")}],
      link: "${fileLinkFormatter(filePath, line)}"
    }`
    })
  }

  return `
  window.__kaioken.HMRContext?.register({
${entries.join(",\n")}
  });`
}

function findHotVarLineInSrc(src: string, name: string) {
  const lines = src.split("\n")
  const potentialMatches = [
    `const ${name}`,
    `let ${name}`,
    `var ${name}`,
    `function ${name}`,
    `export const ${name}`,
    `export let ${name}`,
    `export var ${name}`,
    `export default ${name}`,
    `export function ${name}`,
    `export default function ${name}`,
  ]
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (let j = 0; j < potentialMatches.length; j++) {
      if (line.startsWith(potentialMatches[j])) return i + 1
    }
  }
  return 0
}

function createAliasHandler(name: string, namespace = "kaioken") {
  const aliases = new Set<string>()

  const nodeContainsAliasCall = (node: AstNode) =>
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    typeof node.callee.name === "string" &&
    aliases.has(node.callee.name)

  const addAliases = (node: AstNode): boolean => {
    if (node.source?.value !== namespace) return false
    let didAdd = false
    const specifiers = node.specifiers || []
    for (let i = 0; i < specifiers.length; i++) {
      const specifier = specifiers[i]
      if (
        specifier.imported &&
        specifier.imported.name === name &&
        !!specifier.local
      ) {
        aliases.add(specifier.local.name)
        didAdd = true
      }
    }
    return didAdd
  }
  return { name, aliases, addAliases, nodeContainsAliasCall }
}

function createNamespaceAliasHandler(name: string) {
  const aliases = new Set<string>()

  const addAliases = (node: AstNode) => {
    if (node.source?.value !== name) return
    const specifiers = node.specifiers || []
    for (let i = 0; i < specifiers.length; i++) {
      const specifier = specifiers[i]
      if (specifier.type === "ImportNamespaceSpecifier" && !!specifier.local) {
        aliases.add(specifier.local.name)
        break
      }
    }
  }

  return { name, aliases, addAliases }
}

function findHotVars(bodyNodes: AstNode[], _id: string): Set<HotVarDesc> {
  const hotVars = new Set<HotVarDesc>()

  const aliasHandlers = [
    "createStore",
    "signal",
    "computed",
    "watch",
    "createContext",
    "lazy",
  ].map((name) => createAliasHandler(name))

  for (const node of bodyNodes) {
    if (node.type === "ImportDeclaration") {
      for (const aliasHandler of aliasHandlers) {
        aliasHandler.addAliases(node)
      }
      continue
    }

    if (isComponent(node, bodyNodes)) {
      addHotVarDesc(node, hotVars, "component")
      continue
    }

    for (const aliasHandler of aliasHandlers) {
      if (AST.findNode(node, aliasHandler.nodeContainsAliasCall)) {
        addHotVarDesc(node, hotVars, aliasHandler.name)
        break
      }
    }
  }

  return hotVars
}

function isFuncDecOrExpr(node: AstNode | undefined) {
  if (!node) return false
  if (node.type === "VariableDeclaration") {
    return isFuncDecOrExpr(node.declarations?.[0]?.init)
  }
  return [
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
  ].includes(node.type)
}

function isTopLevelFunction(node: AstNode, bodyNodes: AstNode[]): boolean {
  if (isFuncDecOrExpr(node)) {
    return true
  }
  switch (node.type) {
    case "VariableDeclaration":
    case "ExportNamedDeclaration":
      if (node.declaration) {
        return isFuncDecOrExpr(node.declaration)
      } else if (node.declarations) {
        return !!AST.findNode(node, isFuncDecOrExpr)
      }
      const name = findNodeName(node)
      if (name === null) return false
      const dec = findFunctionBodyNodes(node, name, bodyNodes)
      if (!dec) return false
      return isFuncDecOrExpr(dec[0])
    case "ExportDefaultDeclaration":
      return isFuncDecOrExpr(node.declaration)
  }

  return false
}

function isComponent(node: AstNode, bodyNodes: AstNode[]): boolean {
  const isTlf = isTopLevelFunction(node, bodyNodes)
  if (!isTlf) return false
  const name = findNodeName(node)
  if (name === null) return false
  const charCode = name.charCodeAt(0)
  return charCode >= 65 && charCode <= 90
}

function findNodeName(node: AstNode): string | null {
  if (node.id?.name) return node.id.name
  if (node.declaration?.id?.name) return node.declaration.id.name
  if (node.declaration?.declarations?.[0]?.id?.name)
    return node.declaration.declarations[0].id.name
  if (node.declarations?.[0]?.id?.name) return node.declarations[0].id.name
  return null
}

function addHotVarDesc(node: AstNode, names: Set<HotVarDesc>, type: string) {
  const name = findNodeName(node)
  if (name == null && type === "component") {
    console.error("[vite-plugin-kaioken]: failed to find component name", node)
    throw new Error("[vite-plugin-kaioken]: Component name not found")
  }
  if (name !== null) {
    names.add({ type, name })
  }
}

type ComponentName = string
type HookName = string
type HookToArgs = [HookName, string]

function getComponentHookArgs(
  bodyNodes: AstNode[],
  code: string,
  filePath: string
): Record<string, HookToArgs[]> {
  const res: Record<ComponentName, HookToArgs[]> = {}
  const kaiokenNamespaceAliasHandler = createNamespaceAliasHandler("kaioken")
  for (const node of bodyNodes) {
    if (node.type === "ImportDeclaration") {
      kaiokenNamespaceAliasHandler.addAliases(node)
      continue
    }
    if (isComponent(node, bodyNodes)) {
      const name = findNodeName(node)
      if (name === null) {
        console.error(
          "[vite-plugin-kaioken]: unable to perform hook invalidation (failed to find component name)",
          node.type,
          node.start
        )
        continue
      }

      const hookArgsArr: HookToArgs[] = (res[name] = [])
      const body = findFunctionBodyNodes(node, name, bodyNodes)
      if (!body) {
        /**
         * todo: ensure that if we didn't find a body, it's because
         * the function _actually_ doesn't have a body, eg.
         * const App = () => (<div>Hello World</div>)
         */
        continue
      }

      for (const bodyNode of body) {
        switch (bodyNode.type) {
          case "VariableDeclaration":
            if (!bodyNode.declarations) continue
            for (const dec of bodyNode.declarations) {
              if (
                // handle `const count = useSignal(1)`
                dec.init?.callee?.name?.startsWith("use") &&
                dec.init.arguments
              ) {
                try {
                  const args = argsToString(dec.init.arguments, code)
                  hookArgsArr.push([dec.init.callee.name, args])
                } catch (error) {
                  console.error(
                    "[vite-plugin-kaioken]: err thrown when getting hook args (VariableDeclaration)",
                    filePath,
                    dec.init.callee.name,
                    error
                  )
                }
              } else if (
                // handle `const count = kaioken.useSignal(1)`
                dec.init?.callee?.type === "MemberExpression" &&
                dec.init.callee.object?.name &&
                kaiokenNamespaceAliasHandler.aliases.has(
                  dec.init.callee.object.name
                ) &&
                dec.init.callee.property?.name?.startsWith("use") &&
                dec.init.arguments
              ) {
                try {
                  const args = argsToString(dec.init.arguments, code)
                  hookArgsArr.push([dec.init.callee.property.name, args])
                } catch (error) {
                  console.error(
                    "[vite-plugin-kaioken]: err thrown when getting hook args (VariableDeclaration -> MemberExpression)",
                    filePath,
                    dec.init.callee.property.name,
                    error
                  )
                }
              }
            }
            break
          case "ExpressionStatement":
            if (
              // handle `useEffect(() => {}, [])`
              bodyNode.expression?.type === "CallExpression" &&
              bodyNode.expression.callee?.name?.startsWith("use") &&
              bodyNode.expression.arguments
            ) {
              try {
                const args = argsToString(bodyNode.expression.arguments, code)
                hookArgsArr.push([bodyNode.expression.callee.name, args])
              } catch (error) {
                console.error(
                  "[vite-plugin-kaioken]: err thrown when getting hook args (ExpressionStatement)",
                  filePath,
                  bodyNode.expression.callee.name,
                  error
                )
              }
            } else if (
              // handle `kaioken.useEffect(() => {}, [])`
              bodyNode.expression?.type === "CallExpression" &&
              bodyNode.expression.callee?.type === "MemberExpression" &&
              bodyNode.expression.callee.object?.name &&
              kaiokenNamespaceAliasHandler.aliases.has(
                bodyNode.expression.callee.object.name
              ) &&
              bodyNode.expression.callee.property?.name?.startsWith("use") &&
              bodyNode.expression.arguments
            ) {
              try {
                const args = argsToString(bodyNode.expression.arguments, code)
                hookArgsArr.push([
                  bodyNode.expression.callee.property.name,
                  args,
                ])
              } catch (error) {
                console.error(
                  "[vite-plugin-kaioken]: err thrown when getting hook args (ExpressionStatement -> MemberExpression)",
                  filePath,
                  bodyNode.expression.callee.property.name,
                  error
                )
              }
            }
            break
        }
      }
    }
  }
  return res
}

function findFunctionBodyNodes(
  node: AstNode,
  name: string,
  bodyNodes: AstNode[]
): null | AstNode[] {
  let dec = node.declaration
  if (!dec) {
    for (const _node of bodyNodes) {
      if (_node.type === "VariableDeclaration") {
        if (_node.declarations?.[0]?.id?.name === name) {
          dec = _node
          break
        }
      } else if (_node.type === "FunctionDeclaration") {
        if (_node.id?.name === name) {
          dec = _node
          break
        }
      }
    }
  }
  if (!dec) {
    throw new Error(
      "[vite-plugin-kaioken]: failed to find declaration for component"
    )
  }

  if (
    dec.type === "FunctionDeclaration" &&
    dec.body &&
    !Array.isArray(dec.body) &&
    dec.body.type === "BlockStatement"
  ) {
    return dec.body.body as AstNode[]
  } else if (dec.type === "VariableDeclaration") {
    if (!Array.isArray(dec.declarations)) {
      return null
    }
    for (const _dec of dec.declarations) {
      if (_dec.id?.name !== name) continue
      if (
        _dec.init?.type === "ArrowFunctionExpression" ||
        _dec.init?.type === "FunctionExpression"
      ) {
        return (_dec.init.body as AstNode).body as AstNode[]
      } else if (_dec.init?.type === "CallExpression" && _dec.init.arguments) {
        // accumulate argNodes that are functions and return JSX
        const nodes: AstNode[] = []
        for (const arg of _dec.init.arguments) {
          if (
            isFuncDecOrExpr(arg) &&
            arg.body &&
            !Array.isArray(arg.body) &&
            Array.isArray(arg.body.body)
          ) {
            nodes.push(...arg.body.body)
          }
        }
        return nodes
      }
    }
  }
  return null
}

function getArgValues(args: AstNode[], code: string) {
  return args.map((arg) => code.substring(arg.start, arg.end))
}

function argsToString(args: AstNode[], code: string) {
  return btoa(getArgValues(args, code).join(",").replace(/\s/g, ""))
}

function createUnnamedWatchInserts(code: MagicString, nodes: AstNode[]) {
  const watchAliasHandler = createAliasHandler("watch")

  for (const node of nodes) {
    if (node.type === "ImportDeclaration") {
      watchAliasHandler.addAliases(node)
      continue
    }
    if (AST.findNode(node, watchAliasHandler.nodeContainsAliasCall)) {
      const nameSet = new Set<any>()
      addHotVarDesc(node, nameSet, "unnamedWatch")
      if (nameSet.size === 0) {
        code.appendRight(node.start, UNNAMED_WATCH_PREAMBLE)
      }
    }
  }
}
