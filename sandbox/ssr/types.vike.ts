//https://vike.dev/pageContext#custom

import { UserModel } from "$/drizzle/schema"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
      // Type of pageContext.user
      user: UserModel | null
    }
  }
}

export {}
