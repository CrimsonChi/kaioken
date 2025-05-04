import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { watch } from "node:fs"
import { spawn } from "node:child_process"
import { createServer } from "vite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const pluginPath = join(
  __dirname,
  "../../packages/vite-plugin-kaioken/dist/index.js"
)

async function startVite() {
  const server = await createServer()
  await server.listen()
  const { https, host, port } = server.config.server
  const addr = `http${https ? "s" : ""}://${host ?? "localhost"}:${port}`
  console.log(`Vite server running at ${addr}`)
}

// 🧠 ENTRYPOINT LOGIC
if (process.argv.includes("--child")) {
  startVite()
} else {
  let child = spawn("node", [__filename, "--child"], {
    stdio: "inherit",
  })

  /**
   * unsure why but our watcher is fired 3 times, so we use
   * a simple same-tick debounce to prevent multiple restarts
   */
  let restartTimeout = null
  const restart = () => {
    if (restartTimeout) clearTimeout(restartTimeout)
    restartTimeout = setTimeout(() => {
      console.log("Restarting server due to plugin change...")
      child.kill()
      child = spawn("node", [__filename, "--child"], { stdio: "inherit" })
    })
  }

  const watcher = watch(pluginPath, restart)

  process.on("SIGINT", () => {
    watcher.close()
    child.kill()
    process.exit()
  })
}
