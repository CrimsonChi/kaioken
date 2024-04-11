import { mount as __devtoolsMount } from "kaioken"
import __DevtoolsApp from "./App"
import { type AnchorCorner, __useDevtoolsStore } from "./store"

function __devtoolsGetCornerStyle(corner: AnchorCorner) {
  switch (corner) {
    case "br":
      return "bottom:0;right:0;"
    case "bl":
      return "bottom:0;left:0;"
    case "tl":
      return "top:0;left:0;"
    case "tr":
      return "top:0;right:0;"
  }
}

if ("window" in globalThis) {
  const __devtoolsRoot = Object.assign(document.createElement("div"), {
    id: "devtools-root",
  })
  const style = __devtoolsGetCornerStyle(__useDevtoolsStore.getState().corner)
  __devtoolsRoot.setAttribute("style", "position:fixed;" + style)
  document.body.appendChild(__devtoolsRoot)

  __useDevtoolsStore.subscribe((state) => {
    const style = __devtoolsGetCornerStyle(state.corner)
    __devtoolsRoot.setAttribute("style", "position:fixed;" + style)
  })

  __devtoolsMount(__DevtoolsApp, {
    root: __devtoolsRoot,
    name: "kaioken.devtools",
  })

  window.onbeforeunload = () => {
    const { popupWindow } = __useDevtoolsStore.getState()
    popupWindow?.close()
  }
}
