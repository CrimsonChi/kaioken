//https://vike.dev/pageContext#custom

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vike {
    interface PageContext {
      // Type of pageContext.user
      user?: {
        name: string
        id: string
        isAdmin: boolean
      }
      // Refine type of pageContext.Page (it's `unknown` by default)
      Page: () => JSX.Element
      data: Record<string, unknown>
    }
  }
}

export {}
