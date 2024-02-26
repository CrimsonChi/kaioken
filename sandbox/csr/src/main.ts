import "./index.css"
import { App } from "./App"
import { mount, renderToString } from "kaioken"

const root = document.getElementById("app")!
const root2 = document.getElementById("app2")!

mount(App, root)
mount(App, root2)

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(App())
  console.log("renderToString", html)
}
