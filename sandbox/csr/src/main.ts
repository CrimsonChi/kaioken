import "./index.css"
import { App } from "./App"
import { mount } from "kiru"

mount(App, {
  root: document.getElementById("app")!,
})
