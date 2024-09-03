import { useElementBounding } from "@kaioken-core/hooks"
import { isFragment } from "kaioken/utils"
import { DEFAULT_ANCHOR_POS, PADDING } from "./constants"
import { Storage } from "./types"

export const reinitializeAnchorPos = (
  storage: Storage,
  viewPortRef: Kaioken.RefObject<HTMLElement>,
  elementBound: ReturnType<typeof useElementBounding>
) => {
  if (!viewPortRef.current) return { ...DEFAULT_ANCHOR_POS }

  const rateInWidthChange = window.innerWidth / storage.width
  const rateInHeightChange = window.innerHeight / storage.height

  let forceX: number | null = null
  let forceY: number | null = null
  if (storage.snapSide === "left") {
    forceX =
      (viewPortRef.current.offsetWidth - elementBound.width) * -1 + PADDING
  } else if (storage.snapSide === "right") {
    forceX = -PADDING
  } else if (storage.snapSide === "bottom") {
    forceY = -PADDING
  } else if (storage.snapSide === "top") {
    forceY = (window.innerHeight - elementBound.height) * -1 + PADDING
  }

  return {
    x: forceX ?? storage.x * rateInWidthChange,
    y: forceY ?? storage.y * rateInHeightChange,
  }
}

export const getComponentVnodeFromElement = (domNode: Element | null) => {
  if (domNode == null) return null

  let parentComponent: Kaioken.VNode | null = null
  let parent = (domNode?.__kaiokenNode as Kaioken.VNode)?.parent
  while (parent) {
    if (typeof parent.type === "function" && !isFragment(parent)) {
      parentComponent = parent
      break
    }

    parent = parent.parent
  }

  return parentComponent as Kaioken.VNode & { type: Function }
}

export const getNearestElm = (
  vNode: Kaioken.VNode,
  element: HTMLElement
): Element | undefined => {
  const elementvNodeTreeUptillComponetVnode: Kaioken.VNode[] = []
  const stack = [element.__kaiokenNode!]
  while (stack.length) {
    const node = stack.pop()
    if (node === vNode) {
      break
    }

    if (node?.dom) {
      elementvNodeTreeUptillComponetVnode.push(node)
    }

    if (node?.parent) stack.push(node.parent)
  }
  if (elementvNodeTreeUptillComponetVnode.length === 0) return undefined
  const dom =
    elementvNodeTreeUptillComponetVnode[
      elementvNodeTreeUptillComponetVnode.length - 1
    ]!.dom
  return dom instanceof Element ? dom : undefined
}
