import type { Config } from "vike/types"

export default {
  meta: {
    Page: {
      env: { server: true, client: true },
    },
  },
} satisfies Config
