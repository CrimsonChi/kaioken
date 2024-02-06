import "./PageShell.css"
import { LayoutDefault } from "./LayoutDefault"
import { PageContext } from "vike/types"
import { PageContextProvider } from "$/context/pageContext"

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
