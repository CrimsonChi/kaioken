import type { Rec, VNode } from "./types.js"
import { componentSymbol } from "./constants.js"
import { g } from "./globalState.js"

export { Component }

type ComponentCtor<T> = new (props: T) => Component<T>

abstract class Component<T = Rec, U = Rec> {
  static [componentSymbol] = true
  state: U = {} as U
  props: T
  // @ts-ignore
  vNode: VNode
  constructor(props: T) {
    this.props = props
  }
  abstract render(): JSX.Element

  setState(transformer: (state: this["state"]) => this["state"]) {
    this.state = transformer({ ...this.state })
    if (this.shouldComponentUpdate(this.props, this.state)) {
      g.requestUpdate(this.vNode!)
    }
  }

  static isCtor(type: any): type is ComponentCtor<unknown> {
    return type[componentSymbol]
  }
  static isComponent(type: any): type is Component {
    return typeof type === "object" && type.constructor[componentSymbol]
  }

  componentDidMount?(): void
  componentDidUpdate?(): void
  componentWillUnmount?(): void
  shouldComponentUpdate(nextProps: T, nextState: U): boolean
  shouldComponentUpdate(): boolean {
    return true
  }
}
