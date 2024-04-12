import { fragment, renderToString } from "./index.js"
import { node } from "./globals.js"

export { children }

let hasWarned = false

function children(): JSX.Element {
  if (!node.current) return null
  return fragment({ children: node.current.props.children })
}

children.toString = function () {
  if (!hasWarned) {
    console.error(
      `[kaioken]: Did you forget to execute children() in a component?\n
Correct usage:   <button>{children()}</button>
Incorrect usage: <button>{children}</button> - results in children being rendered as a string.\n
  `
    )
    hasWarned = true
  }
  return renderToString(children)
}
