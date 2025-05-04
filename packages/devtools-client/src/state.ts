import { AppContext, signal } from "kaioken"
import { broadcastChannel, isDevtoolsApp } from "devtools-shared"

export let kaiokenGlobal: typeof window.__kaioken
let allowStandalone = false
if ("window" in globalThis) {
  if (window.opener) {
    kaiokenGlobal = window.opener.__kaioken
  } else if (allowStandalone) {
    kaiokenGlobal = window.__kaioken
  }
}

export const toggleElementToVnode = signal(false)
broadcastChannel.addEventListener((e) => {
  if (e.data.type === "set-inspect-enabled") {
    toggleElementToVnode.value = e.data.value
  }
})

const initialApps = (kaiokenGlobal?.apps ?? []).filter(
  (app) => !isDevtoolsApp(app)
)

export const mountedApps = signal<AppContext[]>(initialApps)
export const selectedElement = signal<Element | null>(null)
export const selectedApp = signal<AppContext | null>(initialApps[0] ?? null)
export const selectedNode = signal<(Kaioken.VNode & { type: Function }) | null>(
  null
)

kaiokenGlobal?.on("mount", (app) => {
  if (isDevtoolsApp(app)) return
  mountedApps.value = [...mountedApps.peek(), app]
  if (selectedApp.peek() === null) {
    selectedApp.value = app
  }
})

kaiokenGlobal?.on("unmount", (app) => {
  mountedApps.value = mountedApps.peek().filter((a) => a !== app)
  if (selectedApp.peek() === app) {
    selectedApp.value = mountedApps.peek()[0] ?? null
  }
})

type KeyboardMapEntry = {
  vNode: Kaioken.VNode
  setCollapsed: (value: Kaioken.StateSetter<boolean>) => void
}
export const keyboardMap = signal(new Map<string, KeyboardMapEntry>())
export const inspectComponent = signal<Kaioken.VNode | null>(null)
export const appTreeSearch = signal("")
