import { env } from "./env"

type CookieSerializeOptions =
  import("D:/kaioken/node_modules/.pnpm/cookie-es@1.0.0/node_modules/cookie-es/dist/index").CookieSerializeOptions

export const cookieSettings = {
  domain: env.domain || "localhost",
  path: "/",
  sameSite: "lax",
  secure: env.isProduction,
} satisfies CookieSerializeOptions
