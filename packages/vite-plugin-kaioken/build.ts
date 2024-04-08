import esbuild from "esbuild"

esbuild.buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  outfile: "./dist/index.js",
  external: ["kaioken"],
  write: true,
})
