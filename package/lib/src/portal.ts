import { Component } from "./component.js"

export { Portal }

type PortalProps = {
  children?: JSX.Element
  container: HTMLElement
}

class Portal extends Component<PortalProps> {
  constructor(props: PortalProps) {
    super(props)
    this.rootDom = props.container
  }
  componentDidMount(): void {
    this.vNode.dom = this.props.container
  }

  render(): JSX.Element {
    return this.props.children ?? null
  }
}
