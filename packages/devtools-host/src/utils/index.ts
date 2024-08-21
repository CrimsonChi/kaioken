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
