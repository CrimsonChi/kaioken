import "./index.css"
import { App } from "./App"
import { mount, renderToString } from "kaioken"

const root = document.getElementById("app")!

mount(App, root)

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(() => App())
  console.log("renderToString", html)
}
