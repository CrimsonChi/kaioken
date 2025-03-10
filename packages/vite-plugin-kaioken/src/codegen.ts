import type { ProgramNode } from "rollup"
import { FilePathFormatter } from "./types"

type TransformInsert = {
  content: string
  start: number
}
type TransformContext = {
  id: string
  code: string
  inserts: TransformInsert[]
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
  expression?: AstNode
  id?: AstNodeId
  init?: AstNode
  object?: AstNodeId
  property?: AstNodeId
  properties?: AstNode[]
  argument?: AstNode
  arguments?: AstNode[]
  specifiers?: AstNode[]
  cases?: AstNode[]
  name?: string
  callee?: AstNode
  exported?: AstNode & { name: string }
  consequent?: AstNode | AstNode[]
  alternate?: AstNode
  local?: AstNode & { name: string }
  imported?: AstNode & { name: string }
  source?: AstNode & { value: string }
  value?: unknown
}

const UNNAMED_WATCH_PREAMBLE = `\n
if (import.meta.hot && "window" in globalThis) {
  window.__kaioken.HMRContext?.signals.registerNextWatch();
}
`

export function injectHMRContextPreamble(
  code: string,
  ast: ProgramNode,
  fileLinkFormatter: FilePathFormatter,
  id: string
) {
  try {
    const transformCtx: TransformContext = {
      id,
      code,
      inserts: [],
    }
    transformInsertUnnamedWatchPreambles(transformCtx, ast.body as AstNode[])
    code = transformInjectInserts(transformCtx)
    const hotVars = findHotVars(ast.body as AstNode[], id)
    if (hotVars.size === 0) return code
    const componentNamesToHookArgs = getComponentHookArgs(
      ast.body as AstNode[],
      code,
      id
    )
    return `
  if (import.meta.hot && "window" in globalThis) {
    window.__kaioken.HMRContext?.prepare("${id}", "${fileLinkFormatter(id)}");
  }
  ${code}
  if (import.meta.hot && "window" in globalThis) {
    import.meta.hot.accept();
    ${createHMRRegistrationBlurb(hotVars, componentNamesToHookArgs)}
  }`
  } catch (error) {
    console.error(error)
    return code
  }
}

type HotVarDesc = {
  type: string
  name: string
}

function createHMRRegistrationBlurb(
  hotVars: Set<HotVarDesc>,
  componentHookArgs: Record<string, HookToArgs[]>
) {
  const entries = Array.from(hotVars).map(({ name, type }) => {
    if (type !== "component") {
      return `    ${name}: {
          type: "${type}",
          value: ${name}
        }`
    }
    const args = componentHookArgs[name].map(([name, args]) => {
      return `{ name: "${name}", args: "${args}" }`
    })
    return `    ${name}: {
          type: "component",
          value: ${name},
          hooks: [${args.join(",")}]
        }`
  })
  return `
  window.__kaioken.HMRContext?.register({
    ${entries.join(",\n")}
});`
}

function createAliasHandler(name: string) {
  const aliases = new Set<string>()

  const nodeContainsAliasCall = (node: AstNode) =>
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    aliases.has(node.callee.name ?? "_not_found_")

  const addAliases = (node: AstNode) => {
    if (!node.source || node.source.value !== "kaioken") return
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
  return { name, addAliases, nodeContainsAliasCall }
}

function findHotVars(nodes: AstNode[], _id: string): Set<HotVarDesc> {
  const hotVars = new Set<HotVarDesc>()

  const aliasHandlers = [
    "createStore",
    "signal",
    "computed",
    "watch",
    "createContext",
  ].map((name) => createAliasHandler(name))

  for (const node of nodes) {
    if (node.type === "ImportDeclaration") {
      for (const aliasHandler of aliasHandlers) {
        aliasHandler.addAliases(node)
      }
      continue
    }

    if (findNode(node, isNodeCreateElementExpression)) {
      addHotVarDesc(node, hotVars, "component")
    }

    for (const aliasHandler of aliasHandlers) {
      if (findNode(node, aliasHandler.nodeContainsAliasCall)) {
        addHotVarDesc(node, hotVars, aliasHandler.name)
      }
    }
  }

  return hotVars
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

function findNodeName(node: AstNode): string | void {
  if (node.id?.name) return node.id.name
  if (node.declaration?.id?.name) return node.declaration.id.name
  if (node.declaration?.declarations?.[0]?.id?.name)
    return node.declaration.declarations[0].id.name
  if (node.declarations?.[0]?.id?.name) return node.declarations[0].id.name
}

function addHotVarDesc(node: AstNode, names: Set<HotVarDesc>, type: string) {
  const name = findNodeName(node)
  if (!name && type === "component") {
    console.error("[vite-plugin-kaioken]: failed to find component name", node)
    throw new Error("[vite-plugin-kaioken]: Component name not found")
  }
  if (name) {
    names.add({ type, name })
  }
}

function transformInjectInserts(ctx: TransformContext) {
  let offset = 0
  const sortedInserts = ctx.inserts.sort((a, b) => a.start - b.start)
  for (let i = 0; i < sortedInserts.length; i++) {
    const { content, start } = sortedInserts[i]
    ctx.code =
      ctx.code.slice(0, start + offset) +
      content +
      ctx.code.slice(start + offset)

    offset += content.length
  }
  return ctx.code
}

type ComponentName = string
type HookName = string
type HookToArgs = [HookName, string]

function getComponentHookArgs(
  nodes: AstNode[],
  code: string,
  id: string
): Record<string, HookToArgs[]> {
  const res: Record<ComponentName, HookToArgs[]> = {}
  for (const node of nodes) {
    if (findNode(node, isNodeCreateElementExpression)) {
      const name = findNodeName(node)
      if (!name) {
        console.error(
          "[vite-plugin-kaioken]: failed to find component name",
          node
        )
        continue
      }

      const hookArgsArr: HookToArgs[] = (res[name] = [])

      if (node.declaration) {
        if (
          node.declaration.type === "FunctionDeclaration" &&
          node.declaration.body &&
          !Array.isArray(node.declaration.body) &&
          node.declaration.body.type === "BlockStatement"
        ) {
          if (!Array.isArray(node.declaration.body.body)) continue
          for (const bodyNode of node.declaration.body.body) {
            switch (bodyNode.type) {
              case "VariableDeclaration":
                if (!bodyNode.declarations) continue
                for (const dec of bodyNode.declarations) {
                  try {
                    if (
                      dec.init?.callee?.name?.startsWith("use") &&
                      dec.init.arguments
                    ) {
                      const args = argsToString(dec.init.arguments, code)
                      hookArgsArr.push([dec.init?.callee?.name, args])
                    }
                  } catch (error) {
                    console.error(
                      "[vite-plugin-kaioken]: err thrown when getting hook args (VariableDeclaration)",
                      id,
                      error,
                      dec.init?.callee
                    )
                  }
                }
                break
              case "ExpressionStatement":
                try {
                  if (
                    bodyNode.expression?.type === "CallExpression" &&
                    bodyNode.expression.callee?.name?.startsWith("use") &&
                    bodyNode.expression.arguments
                  ) {
                    const args = argsToString(
                      bodyNode.expression.arguments,
                      code
                    )
                    hookArgsArr.push([bodyNode.expression.callee?.name, args])
                  }
                } catch (error) {
                  console.error(
                    "[vite-plugin-kaioken]: err thrown when getting hook args (ExpressionStatement)",
                    id,
                    error,
                    bodyNode.expression?.callee
                  )
                }
                break
            }
          }
        }
      }
    }
  }
  return res
}

function argsToString(args: AstNode[], code: string) {
  return btoa(
    args
      .map((arg) => code.substring(arg.start, arg.end))
      .join(",")
      .replace(/\s/g, "")
  )
}

function transformInsertUnnamedWatchPreambles(
  ctx: TransformContext,
  nodes: AstNode[]
) {
  const watchAliasHandler = createAliasHandler("watch")

  for (const node of nodes) {
    if (node.type === "ImportDeclaration") {
      watchAliasHandler.addAliases(node)
      continue
    }
    if (findNode(node, watchAliasHandler.nodeContainsAliasCall)) {
      const nameSet = new Set<any>()
      addHotVarDesc(node, nameSet, "unnamedWatch")
      if (nameSet.size === 0) {
        ctx.inserts.push({
          content: UNNAMED_WATCH_PREAMBLE,
          start: node.start,
        })
      }
    }
  }
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
    (node.expression && findNode(node.expression, predicate)) ||
    (node.cases && node.cases.some((c) => findNode(c, predicate)))
  ) {
    return true
  }

  return false
}
