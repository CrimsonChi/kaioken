import { useMemo, useState } from "kaioken"
import { __useDevtoolsStore } from "./store"
//@ts-ignore
import { useTween, useWindowSize } from "@kaioken-core/hooks"

const size = 30
const padding = 15

export default function __DevtoolsApp() {
  const [corner, setCorner] = useState<"br" | "bl" | "tl" | "tr">("br")
  const { width, height } = useWindowSize()

  const _width = Math.min(width, document.body.clientWidth) // handle scrollbars

  const topLeftOffset = () => ({
    x: padding,
    y: padding,
  })
  const topRightOffset = () => ({ x: _width - size - padding, y: padding })
  const bottomRightOffset = () => ({
    x: _width - size - padding,
    y: height - size - padding,
  })
  const bottomLeftOffset = () => ({ x: padding, y: height - size - padding })

  const coords = useMemo(() => {
    if (corner === "br") return bottomRightOffset()
    if (corner === "bl") return bottomLeftOffset()
    if (corner === "tl") return topLeftOffset()
    else return topRightOffset()
  }, [corner, width, height])

  const {
    value: { popupWindow },
    setPopupWindow,
  } = __useDevtoolsStore()

  function handleOpen() {
    if (popupWindow) return popupWindow.focus()
    const w = window.open("/__devtools__", "_blank", "popup")
    if (!w) return console.error("[kaioken]: Unable to open devtools window")

    w.onload = () => {
      setPopupWindow(w)
      console.log("devtools window opened")
      w.onbeforeunload = () => {
        console.log("devtools window closed")
        setPopupWindow(null)
      }
    }
  }
  return (
    <>
      <button onclick={() => setCorner("tl")}>anchor top left</button>
      <button onclick={() => setCorner("tr")}>anchor top right</button>
      <button onclick={() => setCorner("br")}>anchor bottom right</button>
      <button onclick={() => setCorner("bl")}>anchor bottom left</button>
      <div
        style={{
          position: "fixed",
          top: coords.y + "px",
          left: coords.x + "px",
        }}
      >
        <button onclick={handleOpen}>
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
