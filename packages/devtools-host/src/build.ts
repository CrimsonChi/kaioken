import esbuild from "esbuild"
import { options, writeFile } from "./options"

esbuild.build(options).then(res => {
  writeFile(res.outputFiles![0].text)
})
