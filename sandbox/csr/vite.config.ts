import { defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"

export default defineConfig({
  esbuild: {
    sourcemap: false,
  },
  plugins: [kaioken()],
})
