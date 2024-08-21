import { useCallback } from "kaioken"
import { useDevtoolsStore } from "../store"

export const useDevTools = () => {
  const {
    value: { popupWindow },
    setPopupWindow,
  } = useDevtoolsStore()

  const handleOpen = useCallback(() => {
    if (popupWindow) return popupWindow.focus()
    const features = `popup,width=${Math.floor(window.screen.width / 2)},height=${Math.floor(window.screen.height / 2)};`
    const w = window.open("/__devtools__", "_blank", features)
    if (!w) return console.error("[kaioken]: Unable to open devtools window")

    w.onload = () => {
      setPopupWindow(w)
      console.debug("[kaioken]: devtools window opened")
      w.onbeforeunload = () => {
        console.debug("[kaioken]: devtools window closed")
        setPopupWindow(null)
      }
    }
  }, [popupWindow])

  return handleOpen
}
