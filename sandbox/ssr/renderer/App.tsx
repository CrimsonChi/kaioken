import { PageContext } from "vike/types"
import { PageShell } from "./PageShell"

export function App<T extends Record<string, unknown>>({
  Page,
  data,
  pageContext,
}: {
  Page: (props: T) => JSX.Element
  data: T
  pageContext: PageContext
}) {
  return (
    <PageShell pageContext={pageContext}>
      <Page {...data} />
    </PageShell>
  )
}
