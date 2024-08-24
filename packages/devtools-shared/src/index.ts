import { Signal, signal } from "kaioken"

export { SelectedNodeView } from "./SelectedNodeView"
export { Chevron } from "./Chevron"

declare global {
  interface Window {
    __kaiokenDevTools_toggleElementToVnode: Signal<boolean>
  }
}

if (!window.opener) {
  const s = signal(false)
  s.subscribe((v) => {
    console.debug("[kaioken]: devtools inspector toggled", v)
  })
  window.__kaiokenDevTools_toggleElementToVnode = s
}

export const getInspectorEnabledSignal = (): Signal<boolean> => {
  const w: Window = window.opener ?? window
  return w.__kaiokenDevTools_toggleElementToVnode
}
