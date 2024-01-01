import { defineConfig } from "vite"

export default defineConfig({
  esbuild: {
    jsxInject: `import * as reflex from "reflex-ui"`,
    jsx: "transform",
    jsxFactory: "reflex.createElement",
    loader: "tsx",
    include: ["**/*.tsx", "**/*.ts"],
  },
})
