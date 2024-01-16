import type { Rec, VNode } from "./types.js"
import { componentSymbol } from "./constants.js"
import { g } from "./globalState.js"

export { Component }

abstract class Component<T = Rec> {
  rootDom?: HTMLElement
  static [componentSymbol] = true
  state = {} as Rec
  props: T
  // @ts-ignore
  vNode: VNode
  constructor(props: T) {
    this.props = props
  }
  abstract render(): JSX.Element

  setState(setter: (state: this["state"]) => this["state"]) {
    this.state = setter({ ...this.state })
    if (this.shouldComponentUpdate(this.props, this.state)) {
      queueMicrotask(() => g.requestUpdate(this.vNode))
    }
  }

  static isCtor(type: any): type is typeof Component {
    return type[componentSymbol]
  }
  static isComponent(type: any): type is Component {
    return typeof type === "object" && type.constructor[componentSymbol]
  }

  componentDidMount?(): void
  componentDidUpdate?(): void
  componentWillUnmount?(): void
  shouldComponentUpdate(nextProps: T, nextState: this["state"]): boolean
  shouldComponentUpdate(): boolean {
    return true
  }
}
