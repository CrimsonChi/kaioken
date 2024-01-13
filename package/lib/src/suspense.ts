import type { VNode } from "./types"
import { Component } from "./component.js"

export { Suspense }

interface SuspenseProps {
  fallback: () => JSX.Element
  children?: Array<Promise<JSX.Element> | JSX.Element>
}

class Suspense extends Component<SuspenseProps> {
  state = {
    resolvedChildren: [] as JSX.Element[],
  }
  constructor({ children, ...rest }: SuspenseProps) {
    super({
      ...rest,
      children: children ?? [],
    })
  }

  componentDidMount(): void {
    let newState = { ...this.state }
    ;(this.props.children as Array<VNode>).forEach((child, idx) => {
      if (
        child == null ||
        typeof child.type === "string" ||
        Component.isCtor(child.type)
      ) {
        newState.resolvedChildren[idx] = child
        return
      }

      const node = child.type(child.props)
      if (node instanceof Promise) {
        node.then((resolvedChild) => {
          newState.resolvedChildren[idx] = resolvedChild
          this.setState(newState)
        })
      } else {
        newState.resolvedChildren[idx] = node
      }
    })
    this.setState(newState)
  }

  render() {
    return this.state.resolvedChildren.length > 0
      ? (this.state.resolvedChildren as JSX.Element)
      : this.props.fallback()
  }
}
