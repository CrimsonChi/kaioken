import { mount } from "kaioken"
import App from "./App"
import { useDevtoolsStore } from "./store"
import tailwindCssKaiokenDevToolCssInline from 'inline:./styleProd.css'


;(() => {
  if ("window" in globalThis) {
    //@ts-ignore
    if (window.__kaiokenDevtools) return

    window.__kaioken?.on("mount", () => {
      //@ts-ignore
      if (window.__kaiokenDevtools) return

      const dummy = document.createElement('div')
      dummy.setAttribute('style', 'display: contents')
      document.body.appendChild(dummy)
      
      const shadow = dummy.attachShadow({ mode: 'open' })
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(tailwindCssKaiokenDevToolCssInline)
      shadow.adoptedStyleSheets = [sheet]

      const root = Object.assign(document.createElement("div"), {
        id: "devtools-root",
      })
      root.setAttribute("class", "fixed flex bottom-0 right-0 z-[9999999]")
      shadow.appendChild(root)

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
  }
})()
