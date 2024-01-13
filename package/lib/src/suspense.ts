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
    const state = { ...this.state }
    const children = this.props.children as Array<VNode | null>
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      if (!c || typeof c.type === "string" || Component.isCtor(c.type)) {
        state.resolvedChildren[i] = c
        continue
      }
      const node = c.type(c.props)
      if (!(node instanceof Promise)) {
        state.resolvedChildren[i] = node
        continue
      }
      node.then((resolvedChild) => {
        state.resolvedChildren[i] = resolvedChild
        this.setState(state)
      })
    }
    this.setState(state)
  }

  render() {
    return this.state.resolvedChildren.length > 0
      ? (this.state.resolvedChildren as JSX.Element)
      : this.props.fallback()
  }
}
