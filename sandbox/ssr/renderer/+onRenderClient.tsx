// https://vike.dev/onRenderClient
import type { OnRenderClientAsync } from "vike/types"
import { hydrate } from "kaioken/ssr"
import { PageLayout } from "./PageLayout"

export { onRenderClient }

const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const { Page, data = {} } = pageContext
  hydrate(
    () => (
      <PageLayout>
        <Page {...data} />
      </PageLayout>
    ),
    document.getElementById("page-root")!
  )
}
