import "./style.css"
import { App } from "./App"
import { mount, renderToString } from "kaioken"

const root = document.querySelector<HTMLDivElement>("#app")!

const instance = mount(App, root)
console.log("mounted", instance)

let testRenderToString = false
if (testRenderToString) {
  const html = renderToString(App())
  console.log("renderToString", html)
}
