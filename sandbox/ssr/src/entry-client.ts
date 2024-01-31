import "./style.css"
import { hydrate } from "kaioken/ssr"
import { App } from "./App"

const root = document.getElementById("app")!
hydrate(App, root)
