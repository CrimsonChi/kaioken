import { createAliasHandler, MagicString } from "./shared"
import { ProgramNode } from "rollup"
import * as AST from "./ast"
type AstNode = AST.AstNode

export function prepareDevOnlyHooks(
  code: MagicString,
  ast: ProgramNode,
  isBuild: boolean
) {
  replaceOnHMRCallbacks(code, ast, isBuild)
}

function replaceOnHMRCallbacks(
  code: MagicString,
  ast: ProgramNode,
  isBuild: boolean
) {
  const onHMRAliasHandler = createAliasHandler("onHMR", "vite-plugin-kaioken")

  for (const node of ast.body as AstNode[]) {
    if (node.type === "ImportDeclaration") {
      onHMRAliasHandler.addAliases(node)
      if (onHMRAliasHandler.addAliases(node) && isBuild) {
        code.update(node.start, node.end, "")
      }
      continue
    }

    if (
      node.type === "ExpressionStatement" &&
      node.expression &&
      onHMRAliasHandler.isMatchingCallExpression(node.expression)
    ) {
      if (isBuild) {
        code.update(node.expression.start, node.expression.end, "")
      } else {
        try {
          const callback = node.expression.arguments![0]
          const callbackRaw = code.original.substring(
            callback.start,
            callback.end
          )
          code.update(
            node.expression.start,
            node.expression.end,
            `if ("window" in globalThis) {
  if (import.meta.hot) {
    import.meta.hot.accept(${callbackRaw});
  }           
}`
          )
        } catch {}
      }
    }
  }
}
