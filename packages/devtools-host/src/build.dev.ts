import esbuild from "esbuild"
import { esbuildPluginTransform, options, writeFile } from "./options"
import esbuildPluginInlineImport from "esbuild-plugin-inline-import"

await esbuild
  .context({
    ...options,
    plugins: [
      esbuildPluginInlineImport({
        transform: esbuildPluginTransform,
      }),
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
