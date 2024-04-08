import { defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  esbuild: {
    sourcemap: false,
  },
  plugins: [kaioken(), viteSingleFile()],
})
