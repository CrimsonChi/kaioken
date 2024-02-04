// https://vike.dev/onRenderClient
export { onRenderClient }
import type { OnRenderClientAsync } from "vike/types"

import { hydrate } from "kaioken/ssr"
import { PageLayout } from "./PageLayout"

const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const { Page } = pageContext
  // const p = Page as JSX.Element[]
  hydrate(
    () => <PageLayout>{Page}</PageLayout>,
    document.getElementById("page-root")!
  )
}
