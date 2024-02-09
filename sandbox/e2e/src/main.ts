import "./style.css"
import { App } from "./App"
import { mount } from "kaioken"

const container = document.getElementById("app")!
mount(App, container)
