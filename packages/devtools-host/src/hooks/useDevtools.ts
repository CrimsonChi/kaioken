import { useCallback } from "kaioken"
import { popup } from "../store"

type SavedSize = {
  width: number
  height: number
}

const SIZE_STORAGE_KEY = "kaioken-devtools-popup-size"

export const useDevTools = () => {
  const _popup = popup.value

  const handleOpen = useCallback(
    (onOpened?: (window: Window) => void) => {
      if (_popup) {
        if (_popup.closed) {
          popup.value = null
        } else {
          return _popup.focus()
        }
      }
      const savedSize_raw = sessionStorage.getItem(SIZE_STORAGE_KEY)
      const size = savedSize_raw
        ? (JSON.parse(savedSize_raw) as SavedSize)
        : {
            width: Math.floor(window.innerWidth / 2),
            height: Math.floor(window.innerHeight / 2),
          }
      const features = `popup,width=${size.width},height=${size.height};`
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
      w.onresize = () => {
        sessionStorage.setItem(
          SIZE_STORAGE_KEY,
          JSON.stringify({
            width: w.innerWidth,
            height: w.innerHeight,
          })
        )
      }
    },
    [_popup]
  )

  return handleOpen
}
