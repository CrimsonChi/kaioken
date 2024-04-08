import fs from "node:fs"
import { PluginOption, defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  esbuild: {
    sourcemap: false,
  },
  plugins: [
    kaioken({ devtools: false }),
    viteSingleFile(),
    {
      enforce: "post",
      buildEnd: (err) => {
        if (err) return
        ;(async () => {
          await new Promise((res) => setTimeout(res, 1000))
          const html = await fs.promises.readFile("dist/index.html", "utf-8")
          console.log("read html", html.substring(0, 100))
          fs.rmSync("dist", { recursive: true, force: true })
          fs.mkdirSync("dist")
          fs.writeFileSync(
            "dist/index.js",
            `export default \`${html.replace(/[`\\$]/g, "\\$&")}\``,
            {
              encoding: "utf-8",
            }
          )
          console.log("write html")
        })()
      },
    } as PluginOption,
  ],
})
