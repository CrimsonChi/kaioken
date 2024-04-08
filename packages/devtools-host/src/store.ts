import { createStore as __devtoolsCreateStore } from "kaioken"

export const __useDevtoolsStore = __devtoolsCreateStore(
  {
    popupWindow: null as Window | null,
  },
  (set) => ({
    setPopupWindow: (popupWindow: WindowProxy | null) => set({ popupWindow }),
  })
)
