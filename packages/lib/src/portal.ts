import { renderMode } from "./globals.js"
import { useVNode } from "./hooks/utils.js"
import { getVNodeAppContext, isVNode } from "./utils.js"

export { Portal, isPortal }

type PortalProps = {
  children?: JSX.Children
  container: HTMLElement
}

function Portal({ children, container }: PortalProps) {
  const node = useVNode()
  const ctx = getVNodeAppContext(node)
  node.dom = container
  if (!(node.dom instanceof HTMLElement)) return null
  if (renderMode.current === "hydrate") {
    ctx.scheduler?.nextIdle(() => ctx.requestUpdate(node))
    return null
  }
  return children
}

function isPortal(
  thing: unknown
): thing is Kaioken.VNode & { type: typeof Portal } {
  return isVNode(thing) && thing.type === Portal
}
