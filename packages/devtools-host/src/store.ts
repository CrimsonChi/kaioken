import { signal } from "kaioken"

export const toggleElementToVnode = signal(false)
if ("window" in globalThis) {
  window.__kaioken?.on(
    // @ts-expect-error We have our own custom type here
    "devtools:toggleInspect",
    // @ts-expect-error We have our own custom type here
    ({ value }) => {
      toggleElementToVnode.value = !!value
    }
  )
}

export const popup = signal(null as Window | null)
