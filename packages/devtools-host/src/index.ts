import { mount as __devtoolsMount } from "kaioken"
import __DevtoolsApp from "./App"

const __devtoolsRoot = Object.assign(document.createElement("div"), {
  id: "devtools-root",
})
__devtoolsRoot.setAttribute("style", "display:contents;")
document.body.appendChild(__devtoolsRoot)

__devtoolsMount(__DevtoolsApp, {
  root: __devtoolsRoot,
  name: "kaioken.devtools",
})
