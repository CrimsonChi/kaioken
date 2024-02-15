import { PageContext } from "vike/types"
import { PageShell } from "./PageShell"

export function App({ pageContext }: { pageContext: PageContext }) {
  const { Page, data = {} } = pageContext
  return (
    <PageShell pageContext={pageContext}>
      <Page {...data} />
    </PageShell>
  )
}
