import { App } from "./App"
import "./style.css"
import { ReflexDOM } from "reflex-ui"

const root = document.querySelector<HTMLDivElement>("#app")!

const instance = new ReflexDOM(root).mount(App)
console.log("mounted", instance)
