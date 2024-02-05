import type { Config } from "vike/types"

export default {
  meta: {
    title: {
      // Make the value of `title` available on both the server- and client-side
      env: { server: true, client: true },
    },
    description: {
      // Make the value of `description` available only on the server-side
      env: { server: true },
    },
  },
} satisfies Config
