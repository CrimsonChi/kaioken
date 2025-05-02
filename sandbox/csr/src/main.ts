import "./index.css"
import { App } from "./App"
import { mount } from "kaioken"

mount(App, {
  root: document.getElementById("app")!,
  debug: {
    flashElementOnDiff: true,
  },
})
