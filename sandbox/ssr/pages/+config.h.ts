import type { Config } from "vike/types"

export default {
  meta: {
    Layout: {
      env: { server: true, client: true },
    },
  },
} satisfies Config
