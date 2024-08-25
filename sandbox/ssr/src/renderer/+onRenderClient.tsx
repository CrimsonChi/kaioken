// https://vike.dev/onRenderClient
import type { OnRenderClientAsync, PageContextClient } from "vike/types"
import { hydrate } from "kaioken/ssr/client"
import type { AppContext } from "kaioken"
import { getTitle } from "./utils"
import { App } from "./App"

let appContext: AppContext<{ pageContext: PageContextClient }> | undefined

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const container = document.getElementById("page-root")!

  if (pageContext.isHydration || !appContext) {
    appContext = await hydrate(App, container, { pageContext })
    return
  }

  document.title = getTitle(pageContext)
  await appContext.setProps(() => ({ pageContext }))
}
