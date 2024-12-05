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
  callee?: AstNode & { name: string }
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
    const hotVars = findHotVars(ast.body as AstNode[], id)
    if (hotVars.length === 0) return code

    const transformCtx: TransformContext = {
      id,
      code,
      inserts: [],
    }
    transformInsertUnnamedWatchPreambles(ast.body as AstNode[], transformCtx)
    code = transformInjectInserts(transformCtx)
    return `
  if (import.meta.hot && "window" in globalThis) {
    window.__kaioken.HMRContext?.prepare("${id}", "${fileLinkFormatter(id)}");
  }
  ${code}
  if (import.meta.hot && "window" in globalThis) {
    import.meta.hot.accept();
    window.__kaioken.HMRContext?.register({
  ${hotVars.map((v) => `    ${v}`).join(",\n")}
    });
  }`
  } catch (error) {
    console.error(error)
    return code
  }
}

function createAliasHandler(name: string) {
  const aliases = new Set<string>()

  const nodeContainsAliasCall = (node: AstNode) =>
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    aliases.has(node.callee.name)

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
  return { addAliases, nodeContainsAliasCall }
}

function findHotVars(nodes: AstNode[], _id: string): string[] {
  const hotVarNames = new Set<string>()

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
      addHotVarNames(node, hotVarNames)
    }

    for (const aliasHandler of aliasHandlers) {
      if (findNode(node, aliasHandler.nodeContainsAliasCall)) {
        addHotVarNames(node, hotVarNames)
      }
    }
  }

  return Array.from(hotVarNames)
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

function transformInsertUnnamedWatchPreambles(
  nodes: AstNode[],
  ctx: TransformContext
) {
  const watchAliasHandler = createAliasHandler("watch")

  for (const node of nodes) {
    if (node.type === "ImportDeclaration") {
      watchAliasHandler.addAliases(node)
      continue
    }
    if (findNode(node, watchAliasHandler.nodeContainsAliasCall)) {
      const nameSet = new Set<string>()
      addHotVarNames(node, nameSet)
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
