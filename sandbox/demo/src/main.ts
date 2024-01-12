import "./style.css"
import { App } from "./App"
import { mount } from "kaioken"

const root = document.querySelector<HTMLDivElement>("#app")!

const instance = mount(App, root)
console.log("mounted", instance)
