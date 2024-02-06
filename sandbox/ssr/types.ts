//https://vike.dev/pageContext#custom

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vike {
    interface PageContext {
      Page: () => JSX.Element
      Layout: () => JSX.Element
      title: string | ((ctx: PageContext) => string)

      config: {
        title: string | ((ctx: PageContext) => string)
        Page: () => JSX.Element
        Layout?: () => JSX.Element
      }

      routeParams: Record<string, string>

      data: Record<string, unknown>
      // Type of pageContext.user
      user?: {
        name: string
        id: string
        isAdmin: boolean
      }
    }
  }
}

export {}
