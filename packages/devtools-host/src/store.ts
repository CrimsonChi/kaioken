import { createStore, signal } from "kaioken"

export const toggleElementToVnode = signal(false)
if ("window" in globalThis) {
  window.__kaioken?.on(
    // @ts-expect-error We have our own custom type here
    "__kaiokenDevtoolsInsepctElementToggle",
    ({ name }) => {
      if (name !== "host")
        toggleElementToVnode.value = !toggleElementToVnode.value
    }
  )
}

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
