import { mount } from "kaioken"
import App from "./App"
import { type AnchorCorner, useDevtoolsStore } from "./store"
console.log("__dt")
;(() => {
  if ("window" in globalThis) {
    //@ts-ignore
    if (window.__kaiokenDevtools) return

    window.__kaioken?.on("mount", () => {
      //@ts-ignore
      if (window.__kaiokenDevtools) return
      const root = Object.assign(document.createElement("div"), {
        id: "devtools-root",
      })
      const style = getCornerStyle(useDevtoolsStore.getState().corner)
      root.setAttribute("style", "position:fixed;" + style)
      document.body.appendChild(root)

      useDevtoolsStore.subscribe((state) => {
        const style = getCornerStyle(state.corner)
        root.setAttribute("style", "position:fixed;" + style)
      })
      //@ts-ignore
      window.__kaiokenDevtools = mount(App, {
        root,
        name: "kaioken.devtools",
      })
      window.addEventListener("beforeunload", () => {
        const { popupWindow } = useDevtoolsStore.getState()
        popupWindow?.close()
      })
    })
    function getCornerStyle(corner: AnchorCorner) {
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
  }
})()
