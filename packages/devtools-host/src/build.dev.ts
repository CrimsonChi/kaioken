import esbuild from "esbuild"
import { options, writeFile } from "./options"

await esbuild
  .context({
    ...options,
    plugins: [
      ...options.plugins,
      {
        name: "build-evts",
        setup({ onEnd }) {
          onEnd((result) => {
            writeFile(result.outputFiles![0].text)
          })
        },
      },
    ],
  })
  .then((ctx) => ctx.watch())
