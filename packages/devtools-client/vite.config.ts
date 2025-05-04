import fs from "node:fs"
import { PluginOption, defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  esbuild: {
    jsxInject: `import * as kaioken from "kaioken"`,
    jsx: "transform",
    jsxFactory: "kaioken.createElement",
    jsxFragment: "kaioken.Fragment",
    loader: "tsx",
    include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
  },
  base: "./",
  build: {
    assetsInlineLimit: () => true,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    assetsDir: "",
    rollupOptions: {
      external: ["kaioken"],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    viteSingleFile({
      useRecommendedBuildConfig: false,
    }),
    {
      name: "dt-client:post-build",
      enforce: "post",
      closeBundle(error) {
        console.log("[devtools-client]: Build complete!", error)
        if (error) return
        const html = fs.readFileSync("dist/index.html", "utf-8")
        fs.rmSync("dist", { recursive: true, force: true })
        fs.mkdirSync("dist")
        fs.writeFileSync(
          "dist/index.js",
          `export default \`${html.replace(/[`\\$]/g, "\\$&")}\``,
          { encoding: "utf-8" }
        )
      },
    } satisfies PluginOption,
  ],
})
