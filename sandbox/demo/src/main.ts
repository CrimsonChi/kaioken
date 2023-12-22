import { App } from "./App"
import "./style.css"
import { ReflexDOM } from "reflex-ui"

const root = document.querySelector<HTMLDivElement>("#app")!

const instance = ReflexDOM.mount(root, App)
console.log(instance)
