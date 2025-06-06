import path from "node:path"
import { defineConfig } from "vite"
import ssr from "vike/plugin"
import kaioken from "vite-plugin-kaioken"

export default defineConfig({
  esbuild: {
    //sourcemap: false,
    supported: {
      "top-level-await": true, //browsers can handle top-level-await features
    },
  },
  resolve: {
    alias: {
      $: path.join(__dirname, "src"),
    },
  },
  plugins: [ssr(), kaioken({ include: ["../shared/"] })],
})
