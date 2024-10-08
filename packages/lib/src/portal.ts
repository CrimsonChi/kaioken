import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { renderMode } from "./globals.js"
import { useVNode } from "./hooks/utils.js"
import { getVNodeAppContext, isVNode } from "./utils.js"

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
          throw new KaiokenError({
            message: `Invalid portal container, expected HTMLElement, got ${vNode.dom}`,
            vNode: vNode,
          })
        }
        return null
      }
      return children
    case "hydrate":
      const ctx = getVNodeAppContext(vNode)
      ctx.scheduler?.nextIdle(() => ctx.requestUpdate(vNode))
      return null
    case "stream":
    case "string":
      return null
  }
}

function isPortal(
  thing: unknown
): thing is Kaioken.VNode & { type: typeof Portal } {
  return isVNode(thing) && thing.type === Portal
}
