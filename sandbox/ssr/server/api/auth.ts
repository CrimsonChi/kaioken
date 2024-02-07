import { FastifyInstance } from "fastify"
import oauthPlugin from "@fastify/oauth2"
import { userService } from "../services/userService"
import { AuthProvider, authService } from "../services/authService"
import { env } from "../env"

type CookieSerializeOptions =
  import("D:/kaioken/node_modules/.pnpm/cookie-es@1.0.0/node_modules/cookie-es/dist/index").CookieSerializeOptions

export const cookieSettings = {
  domain: env.domain || "localhost",
  path: "/",
  sameSite: "lax",
  secure: env.isProduction,
} satisfies CookieSerializeOptions

export function configureAuthRoutes(app: FastifyInstance) {
  app.register(oauthPlugin, {
    name: "googleOAuth2",
    credentials: {
      client: env.auth0.google,
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    scope: ["profile", "email", "openid"],
    startRedirectPath: "/login/google",
    callbackUri: `${env.url}/login/google/callback`,
  })

  app.get<{
    Params: { provider: AuthProvider }
    Querystring: { state: string }
  }>("/login/:provider/callback", async function (request, reply) {
    const provider = request.params.provider
    if (provider !== AuthProvider.Google) throw "Unsupported Auth Provider"

    const access_token = await authService.getProviderToken(
      provider,
      app,
      request
    )
    if (!access_token) throw "Failed to get 'access_token'"
    const providerData = await authService.loadProviderData(
      provider,
      access_token
    )
    if (!providerData) throw "Failed to get 'providerData'"
    const { providerId, name, picture, email } =
      authService.normalizeProviderData(provider, providerData)

    const userAuth = await authService.getByProviderId(provider, providerId)

    let userId = userAuth?.userId
    const user = await (userId
      ? userService.getById(userId)
      : userService.upsert({
          name,
          avatarUrl: picture,
          isAdmin: true,
        }))
    if (!user) throw "Failed to load user"
    userId = user.id
    if (!userAuth) {
      await authService.upsert({
        email,
        provider,
        providerId,
        userId,
      })
    }

    reply.setCookie("user", JSON.stringify(user), {
      ...cookieSettings,
      httpOnly: false,
    })
    reply.setCookie("access_token", access_token, {
      ...cookieSettings,
      httpOnly: true,
    })

    reply.redirect("/")
  })

  app.get("/logout", async function (_, reply) {
    reply.clearCookie("user", {
      ...cookieSettings,
      httpOnly: false,
    })
    reply.clearCookie("access_token", {
      ...cookieSettings,
      httpOnly: true,
    })
    reply.redirect("/")
  })
}
