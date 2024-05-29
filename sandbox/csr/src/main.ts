import "./index.css"
import { App } from "./App"
import { AppContext, mount, renderToString } from "kaioken"

const root = document.getElementById("app")!

declare global {
  interface Window {
    kaiokenInstance: AppContext
  }
}

window.kaiokenInstance = await mount(App, {
  root,
  maxFrameMs: 16,
  name: "CSR app",
})

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(() => App())
  console.log("renderToString", html)
}
// import("kaioken")
