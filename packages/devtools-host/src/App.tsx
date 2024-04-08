import { signal, useEffect, useMemo, useState } from "kaioken"
import { __useDevtoolsStore } from "./store"
//@ts-ignore
import { useTween, useWindowSize } from "@kaioken-core/hooks"

const size = 30
const padding = 15

type Vec2 = { x: number; y: number }

const mouseDrag = signal<{
  origin: Vec2
  delta: Vec2
  dragging: boolean
  mouseDown: boolean
}>({
  origin: { x: 0, y: 0 },
  delta: { x: 0, y: 0 },
  dragging: false,
  mouseDown: false,
})

type Corner = "tl" | "tr" | "bl" | "br"

const corner = signal<Corner>("br")

function handlePointerMove(e: PointerEvent) {
  if (!mouseDrag.value.mouseDown) return
  mouseDrag.value.delta.x += e.movementX
  mouseDrag.value.delta.y += e.movementY
  if (
    Math.abs(mouseDrag.value.delta.x) > 5 ||
    Math.abs(mouseDrag.value.delta.y) > 5
  ) {
    mouseDrag.value.dragging = true
    mouseDrag.notify()
  }
}

function handlePointerUp(e: PointerEvent) {
  if (!mouseDrag.value.dragging) return
  e.preventDefault()
  e.stopImmediatePropagation()
  e.stopPropagation()
  window.removeEventListener("pointermove", handlePointerMove)
  window.removeEventListener("pointerup", handlePointerUp)
  const newCorner = getCorner()
  console.log("newCorner", newCorner)
  if (corner.value !== newCorner) corner.value = newCorner
  mouseDrag.value.mouseDown = false
  mouseDrag.notify()
}

function getCorner() {
  let isTop = true
  let isLeft = true
  const { width, height } = getBounds()
  if (mouseDrag.value.origin.x + mouseDrag.value.delta.x > width / 2) {
    isLeft = false
  }
  if (mouseDrag.value.origin.y + mouseDrag.value.delta.y > height / 2) {
    isTop = false
  }

  if (isTop) {
    if (isLeft) {
      return "tl"
    } else {
      return "tr"
    }
  } else {
    if (isLeft) {
      return "bl"
    } else {
      return "br"
    }
  }
}

function getBounds() {
  return {
    width: Math.min(window.innerWidth, document.body.clientWidth),
    height: Math.min(window.innerHeight, document.body.clientHeight),
  }
}

export default function __DevtoolsApp() {
  const { width, height } = useWindowSize()

  const _width = Math.min(width, document.body.clientWidth) // handle scrollbars
  const _height = Math.min(height, document.body.clientHeight) // handle scrollbars

  const topLeftOffset = () => ({
    x: padding,
    y: padding,
  })
  const topRightOffset = () => ({ x: _width - size - padding, y: padding })
  const bottomRightOffset = () => ({
    x: _width - size - padding,
    y: _height - size - padding,
  })
  const bottomLeftOffset = () => ({ x: padding, y: _height - size - padding })

  const [coords, setCoords] = useTween(bottomRightOffset)

  useEffect(() => {
    let newOffset: Vec2 = { x: 0, y: 0 }
    switch (corner.value) {
      case "tl":
        newOffset = topLeftOffset()
        break
      case "tr":
        newOffset = topRightOffset()
        break
      case "bl":
        newOffset = bottomLeftOffset()
        break
      case "br":
        newOffset = bottomRightOffset()
    }
    console.log("useEffect offset", newOffset, coords)
    setCoords(newOffset, {
      duration:
        coords.x === -size - padding && coords.y === -size - padding ? 0 : 300,
    }).then(() => {
      mouseDrag.value.dragging = false
    })
  }, [corner.value, _width, _height])

  const {
    value: { popupWindow },
    setPopupWindow,
  } = __useDevtoolsStore()

  function handleOpen() {
    if (mouseDrag.value.dragging) return
    mouseDrag.value.mouseDown = false
    if (popupWindow) return popupWindow.focus()
    const w = window.open("/__devtools__", "_blank", "popup")
    if (!w) return console.error("[kaioken]: Unable to open devtools window")

    w.onload = () => {
      setPopupWindow(w)
      console.log("[kaioken]: devtools window opened")
      w.onbeforeunload = () => {
        console.log("[kaioken]: devtools window closed")
        setPopupWindow(null)
      }
    }
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top:
            coords.y +
            (mouseDrag.value.dragging ? mouseDrag.value.delta.y : 0) +
            "px",
          left:
            coords.x +
            (mouseDrag.value.dragging ? mouseDrag.value.delta.x : 0) +
            "px",
        }}
      >
        <button
          onclick={handleOpen}
          onpointerdown={(e) => {
            window.addEventListener("pointermove", handlePointerMove)
            window.addEventListener("pointerup", handlePointerUp)
            mouseDrag.value.mouseDown = true
            mouseDrag.value.origin = { x: e.clientX, y: e.clientY }
            mouseDrag.value.delta = { x: 0, y: 0 }
            mouseDrag.value.dragging = false
            mouseDrag.notify()
          }}
          style={{
            pointerEvents: mouseDrag.value.dragging ? "none" : "all",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="crimson"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </button>
      </div>
    </>
  )
}
