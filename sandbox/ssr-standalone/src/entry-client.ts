import { hydrate } from "kaioken/ssr/client"
import App from "./App"

console.log("hydrating...")
hydrate(App, document.body).then(() => console.log("hydrated"))
