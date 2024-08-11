import type { AppContext } from "./appContext.js"
import { Component } from "./component.js"
import { renderMode } from "./globals.js"
import { useAppContext } from "./hooks/utils.js"

export { Portal }

type PortalProps = {
  children?: JSX.Children
  container: HTMLElement
}

const portalIdentifier = Symbol.for("kaioken.portal")

class Portal extends Component<PortalProps> {
  doNotModifyDom = true
  static [portalIdentifier] = true
  ctx: AppContext

  constructor(props: PortalProps) {
    super(props)
    this.vNode.dom = this.props.container
    this.ctx = useAppContext(this.vNode)
  }

  static isPortal(type: unknown): type is typeof Portal {
    return typeof type === "function" && portalIdentifier in type
  }

  render(): JSX.Element {
    if (renderMode.current === "hydrate") {
      this.ctx.scheduler?.nextIdle(() => {
        this.ctx.requestUpdate(this.vNode)
      })
      return null
    }
    return this.props.children ?? null
  }
}
