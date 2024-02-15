import { createContext, useContext } from "kaioken"

export { usePageContext, PageContextProvider }

const Context = createContext<Vike.PageContext & { isClient: boolean }>(null)

function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: Vike.PageContext
  children?: JSX.Element[]
}) {
  return (
    <Context.Provider
      value={{ ...pageContext, isClient: !!globalThis.window?.location }}
    >
      {children}
    </Context.Provider>
  )
}

function usePageContext() {
  return useContext(Context)
}
