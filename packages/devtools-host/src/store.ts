import { createStore as __devtoolsCreateStore } from "kaioken"

export type AnchorCorner = "br" | "bl" | "tl" | "tr"

const __devtoolsInitialCorner =
  localStorage.getItem("kaioken.devtools.anchorCorner") ?? "br"

export const __useDevtoolsStore = __devtoolsCreateStore(
  {
    popupWindow: null as Window | null,
    corner: __devtoolsInitialCorner as AnchorCorner,
    dragging: false,
  },
  (set, get) => ({
    setPopupWindow: (popupWindow: WindowProxy | null) => {
      set((prev) => ({ ...prev, popupWindow }))
    },
    setCorner(corner: AnchorCorner) {
      set((prev) => ({ ...prev, corner }))
    },
    setDragging(dragging: boolean) {
      set((prev) => ({ ...prev, dragging }))
      if (!dragging) {
        localStorage.setItem("kaioken.devtools.anchorCorner", get().corner)
      }
    },
  })
)
