import fs from "node:fs"
import * as AST from "./ast"
import { ProgramNode } from "rollup"
import { FileLinkFormatter } from "../types"
import {
  createAliasHandler,
  findFunctionBodyNodes,
  findNodeName,
  isComponent,
  MagicString,
} from "./shared"

type AstNode = AST.AstNode

type HotVarDesc = {
  type: string
  name: string
}

const UNNAMED_WATCH_PREAMBLE = `\n
if (import.meta.hot && "window" in globalThis) {
  window.__kaioken.HMRContext?.signals.registerNextWatch();
}
`
export function prepareHotVars(
  code: MagicString,
  ast: ProgramNode,
  fileLinkFormatter: FileLinkFormatter,
  filePath: string,
  isVirtualModule: boolean
) {
  try {
    const hotVars = findHotVars(code, ast.body as AstNode[], filePath)
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
      const key = JSON.stringify(name)
      if (type !== "component") {
        return `    ${key}: {
      type: "${type}",
      value: ${name}
    }`
      }

      return `    ${key}: {
        type: "component",
        value: ${name},
        hooks: [],
      }`
    })
  } else {
    const src = fs.readFileSync(filePath, "utf-8")
    entries = Array.from(hotVars).map(({ name, type }) => {
      const key = JSON.stringify(name)
      const line = findHotVarLineInSrc(src, name)
      if (type !== "component") {
        return `    ${key}: {
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
        return `{ name: "${name}", args: ${args} }`
      })
      return `    ${key}: {
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

/**
 * These represent the valid parent stack of a hot var. After the parents,
 * any combination of Property or ObjectExpression is allowed until the CallExpression.
 */
const exprAssign = [
  "ExpressionStatement",
  "AssignmentExpression",
] as const satisfies AstNode["type"][]
const allowedHotVarParentStacks: Array<AstNode["type"][]> = [
  ["VariableDeclaration", "VariableDeclarator"],
  exprAssign,
  ["ExportNamedDeclaration", "VariableDeclaration", "VariableDeclarator"],
]

function findHotVars(
  code: MagicString,
  bodyNodes: AstNode[],
  _id: string
): Set<HotVarDesc> {
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

    /**
     * TODO: refactor to support finding components declared in
     * var > object expressions
     */
    if (isComponent(node, bodyNodes)) {
      addHotVarDesc(node, hotVars, "component")
      continue
    }

    const log = false && _id.includes("App.tsx") ? console.log : () => {}

    for (const aliasHandler of aliasHandlers) {
      AST.walk(node, {
        CallExpression: (node, ctx) => {
          if (!aliasHandler.isMatchingCallExpression(node)) {
            log("not matching call expression", node, ctx.stack)
            return ctx.exitBranch()
          }
          if (
            aliasHandler.name === "watch" &&
            ctx.stack.length === 1 &&
            ctx.stack[0].type === "ExpressionStatement"
          ) {
            code.appendRight(node.start, UNNAMED_WATCH_PREAMBLE)
            return ctx.exit()
          }

          const matchingParentStack = allowedHotVarParentStacks.find(
            (stack) => {
              return stack.every((type, i) => ctx.stack[i]?.type === type)
            }
          )
          if (!matchingParentStack) {
            log("no matching parent stack", node, ctx.stack)
            return ctx.exitBranch()
          }
          if (matchingParentStack === exprAssign) {
            const [_expr, assign] = ctx.stack
            const name = assign.left?.name
            if (!name) return ctx.exit()
            hotVars.add({
              type: aliasHandler.name,
              name,
            })
            return ctx.exit()
          }

          const remainingStack = ctx.stack.slice(matchingParentStack.length)
          if (
            remainingStack.some(
              (n) => n.type !== "ObjectExpression" && n.type !== "Property"
            )
          ) {
            log("no matching parent stack", node, ctx.stack)
            return ctx.exitBranch()
          }

          const name = ctx.stack.reduce((acc, item) => {
            switch (item.type) {
              case "VariableDeclarator":
                return item.id!.name
              case "Property":
                if (!item.key) return acc
                if (item.key.name) return `${acc}.${item.key.name}`
                if (item.key.raw) return `${acc}[${item.key.raw}]`
                return acc
            }
            return acc
          }, "")

          hotVars.add({ type: aliasHandler.name, name })
          ctx.exitBranch()
        },
      })
    }
  }

  return hotVars
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

function argsToString(args: AstNode[], code: string) {
  return JSON.stringify(
    args.map((arg) => code.substring(arg.start, arg.end)).join(",")
  )
}
