import type { ESBuildOptions, Plugin, UserConfig } from "vite"
import devtoolsLinkScript from "kaioken-devtools-host"
import devtoolsUiScript from "kaioken-devtools-client"
import { FileLinkFormatter } from "./types"
import { injectHMRContextPreamble } from "./codegen.js"
import MagicString from "magic-string"
import path from "node:path"

export const defaultEsBuildOptions: ESBuildOptions = {
  jsxInject: `import * as kaioken from "kaioken"`,
  jsx: "transform",
  jsxFactory: "kaioken.createElement",
  jsxFragment: "kaioken.Fragment",
  loader: "tsx",
  include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
}

export interface KaiokenPluginOptions {
  devtools?: boolean
  /**
   * Formats the link displayed in devtools to the component's source code
   * @param path the path to the file that contains the component on disk
   * @param line the component's line number
   * @returns {string} the formatted link
   * @default (path) => `vscode://file/${path}`
   */
  formatFileLink?: FileLinkFormatter
}

const vscodeFileLinkFormatter = (path: string, line: number) =>
  `vscode://file/${path}:${line}`

export default function kaioken(
  opts: KaiokenPluginOptions = {
    devtools: true,
    formatFileLink: vscodeFileLinkFormatter,
  }
): Plugin {
  const tsxOrJsxRegex = /\.(tsx|jsx)$/
  const tsOrJsRegex = /\.(ts|js)$/
  let isProduction = false
  let isBuild = false

  const fileLinkFormatter = opts.formatFileLink || vscodeFileLinkFormatter
  let _config: UserConfig | null = null

  return {
    name: "vite-plugin-kaioken",
    config(config) {
      return (_config = {
        ...config,
        esbuild: {
          ...defaultEsBuildOptions,
          ...config.esbuild,
        },
      } as UserConfig)
    },
    transformIndexHtml(html) {
      if (isProduction || isBuild || !opts.devtools) return
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: "/__devtools__.js",
            },
          },
        ],
      }
    },
    configResolved(config) {
      isProduction = config.isProduction
      isBuild = config.command === "build"
    },
    configureServer(server) {
      if (isProduction || isBuild || !opts.devtools) return
      server.middlewares.use("/__devtools__.js", (_, res) => {
        res.setHeader("Content-Type", "application/javascript")
        res.end(devtoolsLinkScript, "utf-8")
      })
      server.middlewares.use("/__devtools__", (_, res) => {
        res.end(devtoolsUiScript)
      })
    },
    transform(code, id) {
      if (isProduction || isBuild) return
      if (!tsxOrJsxRegex.test(id) && !tsOrJsRegex.test(id)) return { code }
      const projectRoot = path.resolve(_config?.root ?? process.cwd())
      const filePath = path.resolve(id)
      if (!filePath.startsWith(projectRoot)) {
        return { code }
      }
      const ast = this.parse(code)
      const transformed: MagicString | null = injectHMRContextPreamble(
        new MagicString(code),
        ast,
        fileLinkFormatter,
        id
      )
      if (transformed === null) return { code }

      const map = transformed.generateMap({
        source: id,
        file: `${id}.map`,
        includeContent: true,
      })

      return {
        code: transformed.toString(),
        map: map.toString(),
      }
    },
  }
}
