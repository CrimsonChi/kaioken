import esbuild from "esbuild"
import { options, writeFile } from "./options"

const res = esbuild.buildSync(options)
writeFile(res.outputFiles![0].text)
