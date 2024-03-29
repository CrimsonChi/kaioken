import { fragment, renderToString } from "./index.js"
import { node } from "./globals.js"

export { Child, children }

let hasWarned = false

function Child({ name, children }: { name: string; children?: JSX.Element[] }) {
  return fragment({ children: children ?? [], name })
}

function children(name?: string): JSX.Element {
  if (!node.current) return null
  if (name === undefined)
    return fragment({ children: node.current.props.children })

  const stack: Kaioken.VNode[] = [...node.current.props.children]
  while (stack.length) {
    const n = stack.pop()!
    if (n.type === Child && n.props.name === name) {
      return fragment({ children: n.props.children })
    }

    n.child && stack.push(n.child)
    n.sibling && stack.push(n.sibling)
  }
  return null
}

children.toString = function () {
  if (!hasWarned) {
    console.error(
      `[kaioken]: Did you forget to execute children() in a component?\n
Correct usage:   <button>{children()}</button>
Incorrect usage: <button>{children}</button> - results in children being rendered as a string.\n
  `,
      new Error()
    )
    hasWarned = true
  }
  return renderToString(children())
}
