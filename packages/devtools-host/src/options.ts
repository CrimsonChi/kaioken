import type { BuildOptions } from "esbuild"
import fs from "node:fs"
import esbuildPluginInlineImport from "esbuild-plugin-inline-import"

export const options: BuildOptions = {
  entryPoints: ["src/index.ts", 'src/style.css'],
  jsx: "transform",
  outdir: 'dist',
  jsxFactory: "createElement",
  jsxFragment: "fragment",
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "esm",
  minify: true,
  write: false,
  plugins: [
    esbuildPluginInlineImport(),
  ]
}

export function writeFile(content: string) {
  fs.rmSync("dist", { recursive: true, force: true })
  fs.mkdirSync("dist")
  fs.writeFileSync(
    "dist/index.js",
    `export default \`(() => {${content.replace(/[`\\$]/g, "\\$&")}\n})()\``,
    {
      encoding: "utf-8",
    }
  )
}
