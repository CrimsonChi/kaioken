import { defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"

// https://github.com/Applelo/unplugin-inject-preload

export default defineConfig({
  optimizeDeps: {
    include: ["**/*.css"],
  },
  build: {
    outDir: "docs",
  },
  plugins: [kaioken()],
})
