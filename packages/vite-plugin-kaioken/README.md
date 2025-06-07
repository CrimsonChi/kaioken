# vite-plugin-kaioken

Vite plugin for <a href="https://kaioken.dev">Kaioken</a> apps that enables HMR, devtools, and more.

## Installation

```bash
npm i -D vite-plugin-kaioken
# or
pnpm add -D vite-plugin-kaioken
```

### Basic Usage

```ts
// vite.config.ts
import { defineConfig } from "vite"
import kaioken from "vite-plugin-kaioken"

export default defineConfig({
  plugins: [kaioken()],
})
```

### Configuration

```ts
kaioken({
  // Enable or disable the Kaioken devtools.
  // Defaults to true in development mode.
  devtools: false,

  // Or provide configuration for the devtools client
  devtools: {
    // Path where the devtools client will be served
    pathname: "/devtools", // default: "/__devtools__"
    // Optional - function to format file links that will be displayed in the devtools
    formatFileLink: (path, line) => `vscode://file/${path}:${line}`,
  },

  // Additional directories (relative to root) to include in transforms.
  include: ["../shared/"],
})
```
