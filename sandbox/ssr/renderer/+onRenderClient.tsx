// https://vike.dev/onRenderClient
import type { OnRenderClientAsync, PageContextClient } from "vike/types"
import { hydrate } from "kaioken/ssr"
import { PageLayout } from "./PageLayout"

export { onRenderClient }

const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const { Page, data = {} } = pageContext as PageContextClient & {
    Page: (props: unknown) => JSX.Element
  }
  hydrate(
    () => (
      <PageLayout>
        <Page data={data} />
      </PageLayout>
    ),
    document.getElementById("page-root")!
  )
}
