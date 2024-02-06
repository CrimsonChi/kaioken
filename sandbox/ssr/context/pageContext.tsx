import { createContext, useContext } from "kaioken"

export { usePageContext, PageContextProvider }

const Context = createContext<Vike.PageContext>(null)

function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: Vike.PageContext
  children?: JSX.Element[]
}) {
  return <Context.Provider value={pageContext}>{children}</Context.Provider>
}

function usePageContext() {
  return useContext(Context)
}
