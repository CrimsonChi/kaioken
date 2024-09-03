import {
  useEffectDeep,
  useElementBounding,
  useEventListener,
  useMouse,
} from "@kaioken-core/hooks"
import { signal, useCallback, useLayoutEffect, useMemo, useRef } from "kaioken"
import { LOCAL_KEY, PADDING } from "../utils/constants"
import { SnapSide, Storage } from "../utils/types"
import { reinitializeAnchorPos } from "../utils"

export const useAnchorPos = () => {
  const { mouse } = useMouse()
  const startMouse = signal<null | { x: number; y: number }>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const viewPortRef = useRef<HTMLDivElement>(null)
  const elementBound = useElementBounding(anchorRef)
  const lastDroppedCoord = signal({ x: -PADDING, y: -PADDING })
  const anchorCoords = signal({ x: -PADDING, y: -PADDING })
  const viewportSize = signal({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const snapSide = signal<SnapSide>("bottom")
  const timeoutRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const resultString = localStorage.getItem(LOCAL_KEY)
    if (resultString == null) return

    const result: Storage = JSON.parse(resultString)

    viewportSize.value.width = window.innerWidth
    viewportSize.value.height = window.innerHeight
    snapSide.value = result.snapSide

    anchorCoords.value = reinitializeAnchorPos(
      result,
      viewPortRef,
      elementBound
    )
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

      timeoutRef.current = window.setTimeout(() => {
        startMouse.value = { x: e.x, y: e.y }
        lastDroppedCoord.value = anchorCoords.value
      }, 100)
    },
    {
      ref: () => anchorRef.current,
    }
  )

  useEventListener("mouseup", () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (startMouse.value) {
      startMouse.value = null
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({
          ...anchorCoords.value,
          ...viewportSize.value,
          snapSide: snapSide.value,
        })
      )
    }
  })

  const updateAnchorPos = useCallback(() => {
    if (viewPortRef.current == null) return

    const viewportWidth = viewPortRef.current.offsetWidth

    if (snapSide.value === "right") {
      const min = Math.min(-PADDING, anchorCoords.value.y)
      anchorCoords.value = {
        x: -PADDING,
        y: Math.max(
          min,
          (window.innerHeight - elementBound.height) * -1 + PADDING
        ),
      }
    } else if (snapSide.value === "left") {
      const min = Math.min(0, anchorCoords.value.y)
      anchorCoords.value = {
        x: (viewportWidth - elementBound.width) * -1 + PADDING,
        y: Math.max(
          min,
          (window.innerHeight - elementBound.height) * -1 + PADDING
        ),
      }
    } else if (snapSide.value === "top") {
      const min = Math.min(-PADDING, anchorCoords.value.x)
      anchorCoords.value = {
        x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
        y: (window.innerHeight - elementBound.height) * -1 + PADDING,
      }

      return
    } else {
      const min = Math.min(-PADDING, anchorCoords.value.x)
      anchorCoords.value = {
        x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
        y: -PADDING,
      }
    }
  }, [elementBound.width, elementBound.height])

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
      anchorCoords.value = {
        x: -PADDING,
        y: Math.max(
          min,
          (window.innerHeight - elementBound.height) * -1 + PADDING
        ),
      }
      return
    } else if (snapSide.value === "left") {
      const min = Math.min(0, lastDroppedCoord.value.y + distanceCovered.y)
      anchorCoords.value = {
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
      anchorCoords.value = {
        x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
        y: (window.innerHeight - elementBound.height) * -1 + PADDING,
      }

      return
    }

    const min = Math.min(-PADDING, lastDroppedCoord.value.x + distanceCovered.x)
    anchorCoords.value = {
      y: -PADDING,
      x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
    }
  }, [distanceCovered])

  const onResize = useCallback(() => {
    if (viewPortRef.current === null) return

    anchorCoords.value = reinitializeAnchorPos(
      {
        width: viewportSize.value.width,
        height: viewportSize.value.height,
        x: anchorCoords.value.x,
        y: anchorCoords.value.y,
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
        ...anchorCoords.value,
        ...viewportSize.value,
        snapSide: snapSide.value,
      })
    )
  }, [Math.round(elementBound.width), Math.round(elementBound.height)])
  useEventListener("resize", onResize)

  return {
    anchorRef,
    anchorCoords,
    viewPortRef,
    startMouse,
    elementBound,
    snapSide,
    updateAnchorPos,
  }
}
