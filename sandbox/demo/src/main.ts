import { App } from "./app"
import "./style.css"
import { ReflexDOM } from "reflex-ui"

const root = document.querySelector<HTMLDivElement>("#app")!

ReflexDOM.mount(root, App)
