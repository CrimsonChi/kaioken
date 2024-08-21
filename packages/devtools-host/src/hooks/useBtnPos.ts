import {
  useEffectDeep,
  useElementBounding,
  useEventListener,
  useMouse,
} from "@kaioken-core/hooks"
import { signal, useCallback, useLayoutEffect, useMemo, useRef } from "kaioken"
import { LOCAL_KEY, PADDING } from "../utils/constants"
import { SnapSide, Storage } from "../utils/types"
import { reinitializeBtnPos } from "../utils"

export const useBtnPos = () => {
  const { mouse } = useMouse()
  const startMouse = signal<null | { x: number; y: number }>(null)
  const btnRef = useRef<null | HTMLElement>(null)
  const viewPortRef = useRef<null | HTMLElement>(null)
  const elementBound = useElementBounding(btnRef)
  const lastDroppedCoord = signal({ x: -PADDING, y: -PADDING })
  const btnCoords = signal({ x: -PADDING, y: -PADDING })
  const viewportSize = signal({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const snapSide = signal<SnapSide>("bottom")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useLayoutEffect(() => {
    const resultString = localStorage.getItem(LOCAL_KEY)
    if (resultString == null) return

    const result: Storage = JSON.parse(resultString)

    viewportSize.value.width = window.innerWidth
    viewportSize.value.height = window.innerHeight
    snapSide.value = result.snapSide

    btnCoords.value = reinitializeBtnPos(result, viewPortRef, elementBound)
  }, [Math.round(elementBound.width), Math.round(elementBound.height)])

  const distanceCovered = useMemo(() => {
    if (startMouse.value === null) return null

    return {
      x: mouse.x - startMouse.value.x,
      y: mouse.y - startMouse.value.y,
    }
  }, [startMouse.value, mouse])

  useEventListener(
    "mousedown",
    (e) => {
      e.preventDefault()

      timeoutRef.current = setTimeout(() => {
        startMouse.value = { x: e.x, y: e.y }
        lastDroppedCoord.value = btnCoords.value
      }, 100)
    },
    {
      ref: () => btnRef.current,
    }
  )

  useEventListener("mouseup", () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (startMouse.value) {
      startMouse.value = null
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({
          ...btnCoords.value,
          ...viewportSize.value,
          snapSide: snapSide.value,
        })
      )
    }
  })

  useEffectDeep(() => {
    if (distanceCovered === null || !viewPortRef.current) return

    const viewportWidth = viewPortRef.current.offsetWidth
    const isInBottomSeg = mouse.y >= window.innerHeight - 100
    const isInTopSeg = mouse.y <= 100
    const isInMidSeg = !isInTopSeg && !isInBottomSeg

    if (isInMidSeg) {
      const isRight = mouse.x > window.innerWidth / 2
      snapSide.value = isRight ? "right" : "left"
    } else {
      snapSide.value = isInTopSeg ? "top" : "bottom"
    }

    if (snapSide.value === "right") {
      const min = Math.min(
        -PADDING,
        lastDroppedCoord.value.y + distanceCovered.y
      )
      btnCoords.value = {
        x: -PADDING,
        y: Math.max(
          min,
          (window.innerHeight - elementBound.height) * -1 + PADDING
        ),
      }
      return
    } else if (snapSide.value === "left") {
      const min = Math.min(0, lastDroppedCoord.value.y + distanceCovered.y)
      btnCoords.value = {
        x: (viewportWidth - elementBound.width) * -1 + PADDING,
        y: Math.max(
          min,
          (window.innerHeight - elementBound.height) * -1 + PADDING
        ),
      }

      return
    } else if (snapSide.value === "top") {
      const min = Math.min(
        -PADDING,
        lastDroppedCoord.value.x + distanceCovered.x
      )
      btnCoords.value = {
        x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
        y: (window.innerHeight - elementBound.height) * -1 + PADDING,
      }

      return
    }

    const min = Math.min(-PADDING, lastDroppedCoord.value.x + distanceCovered.x)
    btnCoords.value = {
      y: -PADDING,
      x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
    }
  }, [distanceCovered])

  const onResize = useCallback(() => {
    if (viewPortRef.current === null) return

    btnCoords.value = reinitializeBtnPos(
      {
        width: viewportSize.value.width,
        height: viewportSize.value.height,
        x: btnCoords.value.x,
        y: btnCoords.value.y,
        snapSide: snapSide.value,
      },
      viewPortRef,
      elementBound
    )

    viewportSize.value.width = window.innerWidth
    viewportSize.value.height = window.innerHeight

    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({
        ...btnCoords.value,
        ...viewportSize.value,
        snapSide: snapSide.value,
      })
    )
  }, [Math.round(elementBound.width), Math.round(elementBound.height)])
  useEventListener("resize", onResize)

  return {
    btnRef,
    btnCoords,
    viewPortRef,
    startMouse,
    elementBound,
  }
}
