import { __useDevtoolsStore } from "./store"

export default function __DevtoolsApp() {
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
    <button onclick={handleOpen}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="30"
        height="30"
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
  )
}
