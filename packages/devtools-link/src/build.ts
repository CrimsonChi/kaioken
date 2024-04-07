import esbuild from "esbuild"
import { options, writeFile } from "./options"

const { plugins, ...rest } = options
const res = esbuild.buildSync(rest)
writeFile(res.outputFiles![0].text)
