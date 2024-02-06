// https://vike.dev/onRenderClient
import type { OnRenderClientAsync } from "vike/types"
import { hydrate } from "kaioken/ssr"
import { PageShell } from "./PageShell"
import { getTitle } from "./utils"

export { onRenderClient }

const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const { Page, data = {} } = pageContext
  const container = document.getElementById("page-root")!

  if (!pageContext.isHydration) {
    document.title = getTitle(pageContext)
  }
  hydrate(
    () => (
      <PageShell pageContext={pageContext}>
        <Page {...data} />
      </PageShell>
    ),
    container
  )
}
