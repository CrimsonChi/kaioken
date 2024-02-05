import { createServer } from "node:http"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import {
  createApp,
  createRouter,
  eventHandler,
  fromNodeMiddleware,
  setResponseHeaders,
  setResponseStatus,
  toNodeListener,
} from "h3"
import serveStatic from "serve-static"
import { renderPage } from "vike/server"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isProduction = process.env.NODE_ENV === "production"
const root = __dirname

startServer()

async function startServer() {
  const app = createApp()

  if (isProduction) {
    app.use("/", fromNodeMiddleware(serveStatic(`${root}/dist/client`)))
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
    app.use(fromNodeMiddleware(viteDevMiddleware))
  }

  const router = createRouter()

  /**
   * Vike route
   *
   * @link {@see https://vike.dev}
   **/
  router.use(
    "/**",
    eventHandler(async (event) => {
      const pageContextInit = {
        urlOriginal: event.node.req.originalUrl || event.node.req.url!,
      }
      const pageContext = await renderPage(pageContextInit)
      const response = pageContext.httpResponse

      setResponseStatus(event, response?.statusCode)
      setResponseHeaders(event, Object.fromEntries(response?.headers ?? []))

      return response?.getBody()
    })
  )

  app.use(router)

  const server = createServer(toNodeListener(app)).listen(
    process.env.PORT || 5173
  )

  server.on("listening", () => {
    console.log(
      `Server listening on http://localhost:${process.env.PORT || 5173}`
    )
  })
}
