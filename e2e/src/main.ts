import "./style.css"
import { App } from "./App"
import { mount } from "kiru"

const container = document.getElementById("app")!
mount(App, container)
