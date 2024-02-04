import { defineConfig } from "vite"
import trpc from "./trpc/vite-plugin"
import ssr from "vike/plugin"

export default defineConfig({
  esbuild: {
    jsxInject: `import * as kaioken from "kaioken"`,
    jsx: "transform",
    jsxFactory: "kaioken.createElement",
    jsxFragment: "kaioken.fragment",
    loader: "tsx",
    include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
  },
  plugins: [ssr(), trpc()],
})
