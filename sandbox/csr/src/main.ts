import "./index.css"
import { App } from "./App"
import { mount, renderToString } from "kaioken"
import { count } from "./components/signals/test"
import { getCurrentNode } from "kaioken/dist/utils"

const root = document.getElementById("app")!

mount(App, { root, maxFrameMs: 16 })

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(() => App())
  console.log("renderToString", html)
}

console.log(getCurrentNode())
