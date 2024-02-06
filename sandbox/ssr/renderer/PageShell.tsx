import "./PageShell.css"
import { LayoutDefault } from "./LayoutDefault"
import { PageContextProvider } from "./pageContext"
import { PageContext } from "vike/types"

export { PageShell }

function PageShell({
  pageContext,
  children,
}: {
  pageContext: PageContext
  children?: JSX.Element[]
}) {
  const PageLayout = pageContext.config.Layout
  return (
    <PageContextProvider pageContext={pageContext}>
      <LayoutDefault>
        {PageLayout ? <PageLayout>{children}</PageLayout> : children}
      </LayoutDefault>
    </PageContextProvider>
  )
}
