import { useCallback } from "kaioken"
import { popup } from "../store"

export const useDevTools = () => {
  const _popup = popup.value

  const handleOpen = useCallback(
    (onOpened?: (window: Window) => void) => {
      if (_popup) return _popup.focus()
      const features = `popup,width=${Math.floor(window.screen.width / 2)},height=${Math.floor(window.screen.height / 2)};`
      const w = window.open("/__devtools__", "_blank", features)
      if (!w) return console.error("[kaioken]: Unable to open devtools window")

      w.onload = () => {
        popup.value = w
        console.debug("[kaioken]: devtools window opened")
        setTimeout(() => onOpened?.(w), 250)
        w.onbeforeunload = () => {
          console.debug("[kaioken]: devtools window closed")
          popup.value = null
        }
      }
    },
    [_popup]
  )

  return handleOpen
}
