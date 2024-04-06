import { mount as __devtoolsMount } from "kaioken"
import __DevtoolsApp from "./App"

const __devtoolsRoot = Object.assign(document.createElement("div"), {
  id: "devtools-root",
})
__devtoolsRoot.setAttribute(
  "style",
  "position:fixed;bottom:0;right:0;z-index:999999;color:#fff;"
)
document.body.appendChild(__devtoolsRoot)

__devtoolsMount(__DevtoolsApp, __devtoolsRoot)
