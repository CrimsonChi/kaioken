import "./styles.css"
import { mount } from "kiru"
import { App } from "./App"

const root = document.querySelector<HTMLDivElement>("#app")!
mount(App, root)
