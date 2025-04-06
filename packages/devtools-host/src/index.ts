import { mount } from "kaioken"
import App from "./App"
// @ts-expect-error
import tailwindCssKaiokenDevToolCssInline from "inline:./style.css"
import { popup } from "./store"
import { broadcastChannel } from "devtools-shared"
if ("window" in globalThis) {
  let hasMounted = false
  window.__kaioken?.on("mount", async () => {
    if (hasMounted) return
    hasMounted = true

    const pageRoot = document.createElement("kaioken-devtools")
    pageRoot.setAttribute("style", "display: contents")
    document.body.appendChild(pageRoot)

    const shadow = pageRoot.attachShadow({ mode: "open" })
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(tailwindCssKaiokenDevToolCssInline)
    shadow.adoptedStyleSheets = [sheet]

    const appRoot = Object.assign(document.createElement("div"), {
      id: "devtools-root",
      className: "fixed flex bottom-0 right-0 z-[9999999]",
    })
    shadow.appendChild(appRoot)

    mount(App, {
      root: appRoot,
      name: "kaioken.devtools",
    })
    const handleMainWindowClose = () => popup.value?.close()
    window.addEventListener("close", handleMainWindowClose)
    window.addEventListener("beforeunload", handleMainWindowClose)
  })

  broadcastChannel.addEventListener((msg) => {
    if (msg.data.type === "open-editor") {
      window.open(msg.data.fileLink)
    }
  })
}
