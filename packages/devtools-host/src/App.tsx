import { useEffect, useRef } from "kaioken"
import { useDevtoolsStore } from "./store"

function handleDragOver(e: DragEvent) {
  const dragging = useDevtoolsStore.getState().dragging
  if (!dragging) return
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer && (e.dataTransfer.dropEffect = "move")
}

export default function App() {
  const bgRef = useRef<HTMLDivElement>(null)
  const {
    value: { popupWindow, dragging },
    setPopupWindow,
    setCorner,
    setDragging,
  } = useDevtoolsStore()

  useEffect(() => {
    document.body.addEventListener("dragover", handleDragOver)
    return () => {
      document.body.removeEventListener("dragover", handleDragOver)
    }
  }, [])

  function handleOpen() {
    if (popupWindow) return popupWindow.focus()
    const features = `popup,width=${Math.floor(window.screen.width / 2)},height=${Math.floor(window.screen.height / 2)};`
    const w = window.open("/__devtools__", "_blank", features)
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

  function handleDragStart() {
    setDragging(true)
  }

  function handleDrag(e: DragEvent) {
    if (!bgRef.current?.isConnected) return
    e.preventDefault()
    e.stopPropagation()
    if (!useDevtoolsStore.getState().dragging) return

    let isLeft = true,
      isTop = true
    if (e.offsetX > window.innerWidth / 2 + window.scrollX) isLeft = false
    if (e.offsetY > window.innerHeight / 2 + window.scrollY) isTop = false

    const corner = isTop ? (isLeft ? "tl" : "tr") : isLeft ? "bl" : "br"
    setCorner(corner)
  }

  function handleDragEnd(e: DragEvent) {
    if (!bgRef.current?.isConnected) return
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  return (
    <>
      {dragging ? (
        <div
          ref={bgRef}
          style="position:fixed;top:0;left:0;width:100vw;height:100vh;"
        />
      ) : null}
      <button
        draggable
        onclick={handleOpen}
        ondragstart={handleDragStart}
        ondrag={handleDrag}
        ondragend={handleDragEnd}
        tabIndex={-1}
        style={
          "background:crimson;margin:0.5rem;border-radius:50%;padding:0.25rem;" +
          (dragging ? "opacity: 0.5;" : "")
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      </button>
    </>
  )
}
