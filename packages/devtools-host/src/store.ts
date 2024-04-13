export type AnchorCorner = "br" | "bl" | "tl" | "tr"

let initialCorner = "br"
if ("window" in globalThis) {
  const corner = localStorage.getItem("kaioken.devtools.anchorCorner")
  if (corner) {
    initialCorner = corner as AnchorCorner
  }
}

export const useDevtoolsStore = createStore(
  {
    popupWindow: null as Window | null,
    corner: initialCorner as AnchorCorner,
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
