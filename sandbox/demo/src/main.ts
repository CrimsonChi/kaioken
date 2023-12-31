import { App } from "./App"
import "./style.css"
import { render } from "reflex-ui"

const root = document.querySelector<HTMLDivElement>("#app")!

// @ts-ignore
const instance = render(App, root)
console.log("mounted", instance)
