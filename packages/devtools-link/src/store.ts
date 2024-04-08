import {
  createStore as __devtoolsCreateStore,
  type AppContext as __devtoolsAppContext,
} from "kaioken"
import { contexts as __devtoolsAppContexts } from "kaioken/dist/globals"
import type { KaiokenGlobalContext as __devtoolsKaiokenGlobalContext } from "kaioken/dist/globalContext"
import __DevtoolsApp from "./App"

export const __useDevtoolsStore = __devtoolsCreateStore(
  {
    popupWindow: null as Window | null,
  },
  (set) => ({
    setPopupWindow: (window: Window | null) => {
      if (window !== null) {
        const appNames: { id: number; name: string }[] = []
        __devtoolsAppContexts.forEach(
          (a) =>
            !__isDevtoolsApp(a) && appNames.push({ id: a.id, name: a.name })
        )
        window.postMessage({ type: "apps", apps: appNames }, "*")
      }
      set((state) => ({ ...state, popupWindow: window }))
    },
  })
)

window.__kaioken!.on("mount", (app) => {
  if (__isDevtoolsApp(app)) return

  const popup = __useDevtoolsStore.getState().popupWindow
  if (popup === null) return

  // notify popup of app added
  popup.postMessage({ type: "mount", app: { id: app.id, name: app.name } }, "*")
})
window.__kaioken!.on("unmount", (app) => {
  if (__isDevtoolsApp(app)) return

  const popup = __useDevtoolsStore.getState().popupWindow
  if (popup === null) return

  // notify popup of app removed
  popup.postMessage(
    { type: "unmount", app: { id: app.id, name: app.name } },
    "*"
  )
})

function __isDevtoolsApp(app: __devtoolsAppContext) {
  return app.rootNode!.child!.type === __DevtoolsApp
}
