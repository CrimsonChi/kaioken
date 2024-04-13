import type { BuildOptions } from "esbuild"
import fs from "node:fs"

export const options: BuildOptions = {
  entryPoints: ["src/index.ts"],
  jsx: "transform",
  jsxFactory: "createElement",
  jsxFragment: "fragment",
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "esm",

  external: ["kaioken"],
  write: false,
}

export function writeFile(content: string) {
  fs.rmSync("dist", { recursive: true, force: true })
  fs.mkdirSync("dist")
  fs.writeFileSync(
    "dist/index.js",
    `export default \`
import {createElement,fragment} from "./dist/index.js"
    ${content.replace(/[`\\$]/g, "\\$&").replaceAll(`from "kaioken"`, `from "./dist/index.js"`)}\``,
    {
      encoding: "utf-8",
    }
  )
}
