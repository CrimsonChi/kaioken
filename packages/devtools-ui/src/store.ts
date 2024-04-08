import { AppContext, createStore } from "kaioken"

export const useDevtoolsStore = createStore(
  {
    open: false,
    apps: [] as Array<AppRef>,
    selectedElement: null as Element | null,
    selectedApp: null as AppRef | null,
    selectedNode: null as (Kaioken.VNode & { type: Function }) | null,
    popupWindow: null as Window | null,
  },
  (set) => ({
    toggle: () => {
      set((state) => ({ ...state, open: !state.open }))
    },
    addApp: (app: AppContext) => {
      set((state) => ({ ...state, apps: [...state.apps, app] }))
    },
    setApps: (apps: Array<AppRef>) => {
      set((state) => ({ ...state, apps }))
    },
    removeApp: (app: AppRef) => {
      set((state) => ({ ...state, apps: state.apps.filter((a) => a !== app) }))
    },
    setSelectedElement: (element: Element | null) => {
      set((state) => ({ ...state, selectedElement: element }))
    },
    setSelectedApp: (app: AppRef | null) => {
      set((state) => ({ ...state, selectedApp: app }))
    },
    setSelectedNode: (node: (Kaioken.VNode & { type: Function }) | null) => {
      set((state) => ({ ...state, selectedNode: node }))
    },
  })
)

const parent = window.parent

parent.onmessage = (event: MessageEvent<DevtoolsHostMessage>) => {
  switch (event.data.type) {
    case "apps": {
      useDevtoolsStore.methods.setApps(event.data.apps)
      break
    }
  }
}
