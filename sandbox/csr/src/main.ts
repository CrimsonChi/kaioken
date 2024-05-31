import "./index.css"
import { App } from "./App"
import { AppContext, mount, renderToString } from "kaioken"

const root = document.getElementById("app")!

declare global {
  interface Window {
    kaiokenInstance: AppContext
  }
}

const kaiokenInstance = await mount(App, {
  root,
  maxFrameMs: 16,
  name: "CSR app",
})

kaiokenInstance.setProps((old) => ({ ...old, test: 456 }))

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(App, { test: 123 })
  console.log("renderToString", html)
}
// import("kaioken")
