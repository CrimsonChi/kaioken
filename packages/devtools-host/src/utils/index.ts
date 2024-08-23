import { useElementBounding } from "@kaioken-core/hooks"
import { DEFAULT_BTN_POS, PADDING } from "./constants"
import { Storage } from "./types"

export const reinitializeBtnPos = (
  storage: Storage,
  viewPortRef: Kaioken.Ref<HTMLElement | null>,
  elementBound: ReturnType<typeof useElementBounding>
) => {
  if (!viewPortRef.current) return { ...DEFAULT_BTN_POS }

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
    if (typeof parent.type === "function" && parent.type.name !== "fragment") {
      parentComponent = parent
      break
    }

    parent = parent.parent
  }

  return parentComponent
}

export const getNearestElm = (vNode: Kaioken.VNode) => {
  const stack = [vNode]
  while (stack.length) {
    const node = stack.pop()

    if (node?.dom) {
      return node.dom as HTMLElement
    }

    if (node?.sibling) stack.push(node.sibling)
    if (node?.child) stack.push(node.child)
  }

  return null
}
