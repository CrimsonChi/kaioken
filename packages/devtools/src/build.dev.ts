import esbuild from "esbuild"
import { options } from "./options"

await esbuild.context(options).then((ctx) => ctx.watch())
