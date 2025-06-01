interface AstNodeId {
  type: string
  name: string
}

const types = [
  "ImportDefaultSpecifier",
  "ExportNamedDeclaration",
  "FunctionDeclaration",
  "FunctionExpression",
  "BlockStatement",
  "ReturnStatement",
  "CallExpression",
  "Identifier",
  "Literal",
  "VariableDeclaration",
  "VariableDeclarator",
  "ArrowFunctionExpression",
  "ExpressionStatement",
  "UpdateExpression",
  "MemberExpression",
  "ChainExpression",
  "AssignmentExpression",
  "ArrayExpression",
  "ObjectExpression",
  "Property",
] as const

export interface AstNode {
  start: number
  end: number
  type: (typeof types)[number] | (string & {})
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
  key?: AstNode
  value?: unknown
  shorthand?: boolean
}

export function findNode(
  node: AstNode,
  predicate: (node: AstNode) => boolean
): AstNode | null {
  let res: AstNode | null = null
  walk(node, {
    "*": (node, ctx) => {
      if (predicate(node)) {
        res = node
        ctx.exit()
      }
    },
  })
  return res
}
type VisitorCTX = {
  stack: AstNode[]
  exit: () => never
}
type VisitorNodeCallback = (
  node: AstNode,
  ctx: VisitorCTX
) => void | (() => void)

type AstVisitor = {
  [key in AstNode["type"]]?: VisitorNodeCallback
} & {
  "*"?: VisitorNodeCallback
}

export function walk(node: AstNode, visitor: AstVisitor) {
  const ctx: VisitorCTX = {
    stack: [],
    exit: exitWalk,
  }
  try {
    walk_impl(node, visitor, ctx)
  } catch (error) {
    if (error === "walk:exit") return
    throw error
  }
}

const exitWalk = () => {
  throw "walk:exit"
}
function walk_impl(node: AstNode, visitor: AstVisitor, ctx: VisitorCTX) {
  const onExitCallbacks = [
    visitor[node.type]?.(node, ctx),
    visitor["*"]?.(node, ctx),
  ].filter(Boolean) as (() => void)[]
  ctx.stack.push(node)

  if (node.body && Array.isArray(node.body)) {
    for (const child of node.body) {
      walk_impl(child, visitor, ctx)
    }
  } else if (node.body) {
    walk_impl(node.body, visitor, ctx)
  }

  if (node.consequent && Array.isArray(node.consequent)) {
    for (const child of node.consequent) {
      walk_impl(child, visitor, ctx)
    }
  } else if (node.consequent) {
    walk_impl(node.consequent, visitor, ctx)
  }

  node.init && walk_impl(node.init, visitor, ctx)
  node.argument && walk_impl(node.argument, visitor, ctx)
  node.arguments &&
    node.arguments.forEach((c) => {
      walk_impl(c, visitor, ctx)
    })
  node.alternate && walk_impl(node.alternate, visitor, ctx)
  node.callee && walk_impl(node.callee, visitor, ctx)
  node.declaration && walk_impl(node.declaration, visitor, ctx)
  node.declarations &&
    node.declarations.forEach((c) => {
      walk_impl(c, visitor, ctx)
    })
  node.expression && walk_impl(node.expression, visitor, ctx)
  node.cases &&
    node.cases.forEach((c) => {
      walk_impl(c, visitor, ctx)
    })
  node.properties &&
    node.properties.forEach((c) => {
      walk_impl(c, visitor, ctx)
    })
  node.type === "Property" &&
    node.value &&
    typeof node.value === "object" &&
    walk_impl(node.value as AstNode, visitor, ctx)

  ctx.stack.pop()
  onExitCallbacks.forEach((c) => c())
}
