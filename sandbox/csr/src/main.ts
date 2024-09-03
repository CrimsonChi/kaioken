import "./index.css"
import { App } from "./App"
import { AppContext, mount, renderToString } from "kaioken"

const root = document.getElementById("app")!
//  const root2 =document.getElementById('app2')

declare global {
  interface Window {
    kaiokenInstance: AppContext
  }
}

const appCtx = await mount(App, {
  root,
  maxFrameMs: 16,
  name: "CSR app",
})

console.log("kaiokenInstance", appCtx)

/* await mount(App, {
  root: root2,
  maxFrameMs: 16,
  name: "CSR app 2",
}) */

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(App, { test: 123 })
  console.log("renderToString", html)
}
// import("kaioken")
