import { AppContext, createStore } from "kaioken"
import { isDevtoolsApp } from "./utils"

export const kaiokenGlobal = window.opener.__kaioken as typeof window.__kaioken

export const useDevtoolsStore = createStore(
  {
    apps: (kaiokenGlobal?.apps ?? []).filter((app) => !isDevtoolsApp(app)),
    selectedElement: null as Element | null,
    selectedApp: null as AppContext | null,
    selectedNode: null as (Kaioken.VNode & { type: Function }) | null,
    popupWindow: null as Window | null,
  },
  (set) => ({
    addApp: (app: AppContext) => {
      set((state) => ({ ...state, apps: [...state.apps, app] }))
    },
    setApps: (apps: Array<AppContext>) => {
      set((state) => ({ ...state, apps }))
    },
    removeApp: (app: AppContext) => {
      set((state) => ({ ...state, apps: state.apps.filter((a) => a !== app) }))
    },
    setSelectedElement: (element: Element | null) => {
      set((state) => ({ ...state, selectedElement: element }))
    },
    setSelectedApp: (app: AppContext | null) => {
      set((state) => ({ ...state, selectedApp: app }))
    },
    setSelectedNode: (node: (Kaioken.VNode & { type: Function }) | null) => {
      set((state) => ({ ...state, selectedNode: node }))
    },
  })
)

kaiokenGlobal?.on("mount", (app) => {
  if (!isDevtoolsApp(app)) {
    useDevtoolsStore.methods.addApp(app)
  }
})
kaiokenGlobal?.on("unmount", (app) => {
  useDevtoolsStore.methods.removeApp(app)
})
