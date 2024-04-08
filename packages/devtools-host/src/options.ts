import type { BuildOptions } from "esbuild"
import fs from "node:fs"

export const options: BuildOptions = {
  entryPoints: ["src/index.ts"],
  jsx: "transform",
  jsxFactory: "devtoolsKaioken.createElement",
  jsxFragment: "devtoolsKaioken.fragment",
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "esm",

  external: ["kaioken"],
  write: false,
  plugins: [
    {
      name: "build-evts",
      setup({ onEnd }) {
        onEnd((result) => {
          writeFile(result.outputFiles![0].text)
        })
      },
    },
  ],
}

export function writeFile(content: string) {
  fs.rmSync("dist", { recursive: true, force: true })
  fs.mkdirSync("dist")
  fs.writeFileSync(
    "dist/index.js",
    `export default \`import * as devtoolsKaioken from 'kaioken';\n${content}\``,
    {
      encoding: "utf-8",
    }
  )
}
