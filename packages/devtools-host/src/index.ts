import { mount as __devtoolsMount } from "kaioken"
import __DevtoolsApp from "./App"
import { __useDevtoolsStore } from "./store"

if ("window" in globalThis) {
  const __devtoolsRoot = Object.assign(document.createElement("div"), {
    id: "devtools-root",
  })
  __devtoolsRoot.setAttribute("style", "position:fixed;bottom:0;right:0;")
  document.body.appendChild(__devtoolsRoot)

  __devtoolsMount(__DevtoolsApp, {
    root: __devtoolsRoot,
    name: "kaioken.devtools",
  })

  window.onbeforeunload = () => {
    const { popupWindow } = __useDevtoolsStore.getState()
    popupWindow?.close()
  }
}
