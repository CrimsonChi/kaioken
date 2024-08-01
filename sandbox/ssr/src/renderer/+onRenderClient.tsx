// https://vike.dev/onRenderClient
import type { OnRenderClientAsync, PageContext } from "vike/types"
import { hydrate } from "kaioken/ssr/client"
import { getTitle } from "./utils"
import { App } from "./App"
import { AppContext } from "kaioken"

let appCtx: AppContext<{ pageContext: PageContext }>

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const container = document.getElementById("page-root")!

  if (pageContext.isHydration) {
    appCtx = await hydrate(App, container, { pageContext })
    return
  }

  document.title = getTitle(pageContext)
  await appCtx.setProps(() => ({ pageContext }))
}
