import { createStore } from "kaioken"

export const useDevtoolsStore = createStore(
  {
    popupWindow: null as Window | null,
  },
  (set) => ({
    setPopupWindow: (popupWindow: WindowProxy | null) => {
      set((prev) => ({ ...prev, popupWindow }))
    },
  })
)
