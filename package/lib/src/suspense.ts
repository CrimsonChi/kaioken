import { Component } from "./component"
import { VNode } from "./types"

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
      if (child == null) return

      if (typeof child.type === "string") {
        this.state.resolvedChildren[idx] = child
        return
      }

      if (Component.isCtor(child.type)) {
        const node = child.instance?.render()
        if (node) this.state.resolvedChildren[idx] = node
        return
      }
      if (child.type instanceof Function) {
        const node = (child.type as Function)(child?.props)
        if (node instanceof Promise) {
          node.then((resolvedChild) => {
            newState.resolvedChildren[idx] = resolvedChild
            this.setState(newState)
          })
        } else {
          newState.resolvedChildren[idx] = node
        }
        return
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
