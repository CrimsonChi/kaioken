import { defineConfig } from "cypress"
import { createServer, type ViteDevServer } from "vite"

async function startServer() {
  const server = await createServer({
    configFile: "./vite.config.ts",
  })
  return await server.listen()
}

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      let server: ViteDevServer | null = null
      on("before:run", async () => {
        server = await startServer()
      })
      on("after:run", async () => {
        await server?.close()
      })
    },
  },
  video: false,
  screenshotOnRunFailure: false,
})
