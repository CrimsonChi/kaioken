// https://github.com/royalswe/vike-fastify-boilerplate/blob/main/server/index.ts
import fastify from "fastify"
import cookie from "@fastify/cookie"
import compress from "@fastify/compress"
import fStatic from "@fastify/static"

import { renderPage } from "vike/server"
import { env } from "./env"
import { OAuth2Namespace } from "@fastify/oauth2"
import { UserModel } from "$/drizzle/schema"
import { configureAuthRoutes } from "./api/auth"

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: {
      (request: FastifyRequest, reply: FastifyReply): Promise<void>
    }
    googleOAuth2: OAuth2Namespace
  }
  interface Session {
    authCallback: string
    id?: number
  }
}

const root = process.cwd()
async function startServer() {
  const app = fastify()
    .register(cookie)
    .register(compress, { global: true })
    .setErrorHandler(function (error, _, reply) {
      // Log error
      this.log.error(error)

      // Send error response
      reply
        .status(error.statusCode ?? 500)
        .send({ message: error.message ?? "Internal Server Error" })
    })

  if (env.isProduction) {
    app.register(fStatic, {
      root: `${root}/dist/client/assets`,
      prefix: "/assets",
    })
  } else {
    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    const vite = await import("vite")
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true },
      })
    ).middlewares

    app.addHook("onRequest", async (request, reply) => {
      const next = () =>
        new Promise<void>((resolve) => {
          viteDevMiddleware(request.raw, reply.raw, () => resolve())
        })
      await next()
    })
  }

  app.get("/favicon.ico", (_, res) => {
    res.status(404).send()
  })

  configureAuthRoutes(app)

  app.get("*", async (request, reply) => {
    const reqUser = request.cookies["user"]

    const pageContextInit = {
      urlOriginal: request.raw.url || "",
      user: reqUser ? (JSON.parse(reqUser) as UserModel) : null,
    }
    const pageContext = await renderPage(pageContextInit)
    const { httpResponse } = pageContext
    if (!httpResponse) {
      reply.callNotFound()
      return
    } else {
      const { headers } = httpResponse
      headers.forEach(([name, value]) => reply.raw.setHeader(name, value))

      httpResponse.pipe(reply.raw)
      return reply
    }
  })

  return app
}
async function main() {
  const fastify = await startServer()
  const { host, port } = env
  fastify.listen({ host, port }, function (err) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    console.log(`Server listening at http://${host}:${port}`)
  })
}

main()
