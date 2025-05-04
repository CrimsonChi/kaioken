import { defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"

export default defineConfig({
  esbuild: {
    //sourcemap: false,
    supported: {
      "top-level-await": true, //browsers can handle top-level-await features
    },
  },
  plugins: [
    kaioken({
      devtools: {
        pathname: "/__devtools__",
      },
    }),
  ],
})
