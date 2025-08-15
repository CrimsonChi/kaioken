import { __DEV__ } from "./env.js"
import { KiruError } from "./error.js"
import { renderMode } from "./globals.js"
import { useVNode } from "./hooks/utils.js"
import { nextIdle, requestUpdate } from "./scheduler.js"

export { Portal, isPortal }

type PortalProps = {
  children?: JSX.Children
  container: HTMLElement | (() => HTMLElement)
}

function Portal({ children, container }: PortalProps) {
  const vNode = useVNode()
  switch (renderMode.current) {
    case "dom":
      vNode.dom = typeof container === "function" ? container() : container
      if (!(vNode.dom instanceof HTMLElement)) {
        if (__DEV__) {
          throw new KiruError({
            message: `Invalid portal container, expected HTMLElement, got ${vNode.dom}`,
            vNode: vNode,
          })
        }
        return null
      }
      return children
    case "hydrate":
      nextIdle(() => requestUpdate(vNode))
      return null
    case "stream":
    case "string":
      return null
  }
}

function isPortal(
  node: Kiru.VNode
): node is Kiru.VNode & { type: typeof Portal } {
  return node.type === Portal
}
