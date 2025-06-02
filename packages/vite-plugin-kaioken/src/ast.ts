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
  // Call visitor before children traversal
  const onExitCallbacks = [
    visitor[node.type]?.(node, ctx),
    visitor["*"]?.(node, ctx),
  ].filter(Boolean) as (() => void)[]

  ctx.stack.push(node)

  // Traverse children arrays or single nodes
  // For each array, pass the array and index so we track siblings[
  ;[
    node.arguments,
    node.declarations,
    node.properties,
    node.cases,
    node.body,
    node.consequent,
    node.init,
    node.argument,
    node.alternate,
    node.callee,
    node.declaration,
    node.expression,
  ]
    .filter(Boolean)
    .forEach((a) => {
      if (Array.isArray(a)) {
        for (let i = 0; i < a.length; i++) {
          walk_impl(a![i], visitor, ctx)
        }
        return
      }
      if (typeof a === "object" && "type" in a) {
        walk_impl(a as AstNode, visitor, ctx)
        return
      }
    })

  // only walk 'value' of Property nodes
  if (
    node.type === "Property" &&
    node.value &&
    typeof node.value === "object"
  ) {
    walk_impl(node.value as AstNode, visitor, ctx)
  }

  ctx.stack.pop()
  onExitCallbacks.forEach((c) => c())
}
