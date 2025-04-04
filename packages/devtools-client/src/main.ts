import "./index.css"
import { mount } from "kaioken"
import { App } from "./App"
import { kaiokenGlobal } from "./store"

mount(App, document.getElementById("app")!).then(() => {
  // @ts-expect-error We have our own custom type here
  kaiokenGlobal?.emit("devtools:ready")
})
