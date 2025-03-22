import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { renderMode } from "./globals.js"
import { useVNode } from "./hooks/utils.js"
import { getVNodeAppContext } from "./utils.js"

export { Portal, isPortalRoot }

type PortalProps = {
  children?: JSX.Children
  container: HTMLElement | (() => HTMLElement)
}

const $PORTAL_ROOT = Symbol.for("kaioken:portal-root")

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
      Object.assign(vNode.dom, { [$PORTAL_ROOT]: true })
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

function isPortalRoot(
  thing: unknown
): thing is HTMLElement & { [$PORTAL_ROOT]: true } {
  return !!thing && thing instanceof HTMLElement && $PORTAL_ROOT in thing
}
