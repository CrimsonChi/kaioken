import type { Config, PageContextServer } from "vike/types"

export default {
  passToClient: ["routeParams", "Layout"] satisfies Array<
    keyof PageContextServer
  >,
  clientRouting: true,
  meta: {
    title: {
      env: { server: true, client: true },
    },
  },
} satisfies Config
