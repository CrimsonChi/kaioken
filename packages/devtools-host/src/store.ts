import { createStore, signal } from "kaioken"

export const toggleElementToVnode = signal(false)
if ("window" in globalThis) {
  window.__kaioken?.on(
    // @ts-expect-error We have our own custom type here
    "__kaiokenDevtoolsInspectElementValue",
    // @ts-expect-error We have our own custom type here
    ({ value }) => {
      toggleElementToVnode.value = !!value
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
