import { Component } from "./component.js"

export { Portal }

type PortalProps = {
  children?: JSX.Children
  container: HTMLElement
}

class Portal extends Component<PortalProps> {
  doNotModifyDom = true
  constructor(props: PortalProps) {
    super(props)
  }
  componentDidMount(): void {
    this.vNode.dom = this.props.container
  }

  render(): JSX.Element {
    return (this.props.children as JSX.Element) ?? null
  }
}
