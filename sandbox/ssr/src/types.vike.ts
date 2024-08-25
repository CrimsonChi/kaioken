//https://vike.dev/pageContext#custom

declare global {
  namespace Vike {
    interface PageContext {
      abortReason?: string | { notAdmin: true }
      abortStatusCode?: number
      is404?: boolean

      Page: Kaioken.FC
      Layout: Kaioken.FC
      title: string | ((ctx: PageContext) => string)

      config: {
        title: string | ((ctx: PageContext) => string)
        Page: Kaioken.FC
        Layout?: Kaioken.FC
      }

      routeParams: Record<string, string>

      data: Record<string, unknown>
    }
  }
}

export {}
