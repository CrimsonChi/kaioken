import { defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [kaioken()],
})
