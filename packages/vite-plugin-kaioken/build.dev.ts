import esbuild from "esbuild"
import fs from "node:fs"

await esbuild
  .context({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    target: "esnext",
    format: "esm",
    outfile: "./dist/index.js",
    external: ["kaioken"],
    write: true,
    plugins: [
      {
        name: "build-evts",
        setup({ onEnd }) {
          onEnd(() => {
            console.log("[vite-plugin-kaioken]: Build complete!")
            fs.copyFileSync("./src/types.d.ts", "dist/index.d.ts")
          })
        },
      },
    ],
  })
  .then((ctx) => {
    ctx.watch()
    console.log("[vite-plugin-kaioken]: Watching for changes...")
  })
