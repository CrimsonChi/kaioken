import { App } from "./App"
import "./style.css"
import { mount } from "reflex-ui"

const root = document.querySelector<HTMLDivElement>("#app")!

// @ts-ignore
const instance = mount(App, root)
console.log("mounted", instance)
