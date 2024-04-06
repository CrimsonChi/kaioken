import {
  useState as __devtoolsUseState,
  Transition as __devtoolsTransition,
  createStore as __devtoolsCreateStore,
  type AppContext as __devtoolsAppContext,
} from "kaioken"
import { contexts as __devtoolsAppContexts } from "kaioken/dist/globals"
import type { KaiokenGlobalContext } from "kaioken/dist/globalContext"
import __DevtoolsApp from "./App"

export const __useDevtoolsStore = __devtoolsCreateStore(
  {
    open: false,
    apps: [] as Array<__devtoolsAppContext>,
    selectedElement: null as Element | null,
    selectedApp: null as __devtoolsAppContext | null,
    selectedNode: null as (Kaioken.VNode & { type: Function }) | null,
  },
  (set) => ({
    toggle: () => set((state) => ({ ...state, open: !state.open })),
    addApp: (app: __devtoolsAppContext) =>
      set((state) => ({ ...state, apps: [...state.apps, app] })),
    removeApp: (app: __devtoolsAppContext) =>
      set((state) => ({ ...state, apps: state.apps.filter((a) => a !== app) })),
    setSelectedElement: (element: Element | null) =>
      set((state) => ({ ...state, selectedElement: element })),
    setSelectedApp: (app: __devtoolsAppContext | null) =>
      set((state) => ({ ...state, selectedApp: app })),
    setSelectedNode: (node: (Kaioken.VNode & { type: Function }) | null) =>
      set((state) => ({ ...state, selectedNode: node })),
  })
)
// prepopulate apps
__devtoolsAppContexts.forEach((app) => {
  __useDevtoolsStore.methods.addApp(app)
})

const __devtoolsGlobalCtx = window.__kaioken! as KaiokenGlobalContext
__devtoolsGlobalCtx.on("mount", (app) => {
  if (app.rootNode!.child!.type === __DevtoolsApp) {
    return
  }
  __useDevtoolsStore.methods.addApp(app)
})
__devtoolsGlobalCtx.on("unmount", (app) => {
  if (app.rootNode!.child!.type === __DevtoolsApp) {
    return
  }
  __useDevtoolsStore.methods.removeApp(app)
})
