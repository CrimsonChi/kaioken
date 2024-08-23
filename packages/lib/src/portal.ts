import { Component } from "./component.js"
import { renderMode } from "./globals.js"
import { getVNodeAppContext } from "./utils.js"

export { Portal }

type PortalProps = {
  children?: JSX.Children
  container: HTMLElement
}

const portalIdentifier = Symbol.for("kaioken.portal")

class Portal extends Component<PortalProps> {
  doNotModifyDom = true
  static [portalIdentifier] = true

  constructor(props: PortalProps) {
    super(props)
    this.vNode.dom = this.props.container
  }

  static isPortal(type: unknown): type is typeof Portal {
    return typeof type === "function" && portalIdentifier in type
  }

  render(): JSX.Element {
    if (renderMode.current === "hydrate") {
      const ctx = getVNodeAppContext(this.vNode)
      ctx.scheduler?.nextIdle(() => {
        ctx.requestUpdate(this.vNode)
      })
      return null
    }
    return this.props.children ?? null
  }
}
