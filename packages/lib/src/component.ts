import { componentSymbol } from "./constants.js"
import { node } from "./globals.js"
import { getVNodeAppContext } from "./utils.js"

export { Component }

export type ComponentConstructor = new <T = Record<string, unknown>>(
  props: T
) => Component<T>

abstract class Component<T = Record<string, unknown>> {
  doNotModifyDom = false
  static [componentSymbol] = true
  state = {} as Record<string, unknown>
  props: T
  vNode: Kaioken.VNode
  constructor(props: T) {
    this.props = props
    this.vNode = node.current!
  }
  abstract render(): JSX.Element

  setState(setter: (state: this["state"]) => this["state"]) {
    this.state = setter({ ...this.state })
    if (this.shouldComponentUpdate(this.props, this.state)) {
      const ctx = getVNodeAppContext(this.vNode)
      queueMicrotask(() => ctx.requestUpdate(this.vNode))
    }
  }

  static isCtor(type: unknown): type is ComponentConstructor {
    return typeof type === "function" && componentSymbol in type
  }

  componentDidMount?(): void
  componentDidUpdate?(): void
  componentWillUnmount?(): void
  shouldComponentUpdate(nextProps: T, nextState: this["state"]): boolean
  shouldComponentUpdate(): boolean {
    return true
  }
}
