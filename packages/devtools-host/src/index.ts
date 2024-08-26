import { mount } from "kaioken"
import App from "./App"
import tailwindCssKaiokenDevToolCssInline from "inline:./style.css"
import { popup } from "./store"
;(() => {
  if (!("window" in globalThis)) return
  let hasMounted = false
  window.__kaioken?.on("mount", async () => {
    if (hasMounted) return
    hasMounted = true

    const dummy = document.createElement("div")
    dummy.setAttribute("style", "display: contents")
    document.body.appendChild(dummy)

    const shadow = dummy.attachShadow({ mode: "open" })
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(tailwindCssKaiokenDevToolCssInline)
    shadow.adoptedStyleSheets = [sheet]

    const root = Object.assign(document.createElement("div"), {
      id: "devtools-root",
    })
    root.setAttribute("class", "fixed flex bottom-0 right-0 z-[9999999]")
    shadow.appendChild(root)

    mount(App, {
      root,
      name: "kaioken.devtools",
    })
    const handleMainWindowClose = () => popup.value?.close()
    window.addEventListener("close", handleMainWindowClose)
    window.addEventListener("beforeunload", handleMainWindowClose)
  })
})()
