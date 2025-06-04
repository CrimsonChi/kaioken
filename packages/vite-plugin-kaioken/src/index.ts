import {
  type ViteDevServer,
  type ESBuildOptions,
  type IndexHtmlTransformResult,
  type Plugin,
  type UserConfig,
} from "vite"
import devtoolsClientBuild from "kaioken-devtools-client"
import devtoolsHostBuild from "kaioken-devtools-host"
import {
  injectHMRContextPreamble,
  prepareHydrationBoundaries,
} from "./codegen.js"
import MagicString from "magic-string"
import path from "node:path"
import { FileLinkFormatter, KaiokenPluginOptions } from "./types"

export const defaultEsBuildOptions: ESBuildOptions = {
  jsxInject: `import { createElement as _jsx, Fragment as _jsxFragment } from "kaioken"`,
  jsx: "transform",
  jsxFactory: "_jsx",
  jsxFragment: "_jsxFragment",
  loader: "tsx",
  include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
}

export default function kaioken(opts?: KaiokenPluginOptions): Plugin {
  let isProduction = false
  let isBuild = false

  const fileLinkFormatter: FileLinkFormatter =
    opts?.formatFileLink ||
    ((path: string, line: number) => `vscode://file/${path}:${line}`)

  let dtClientPathname = "/__devtools__"
  if (typeof opts?.devtools === "object") {
    dtClientPathname = opts.devtools.pathname ?? dtClientPathname
  }
  const dtHostScriptPath = "/__devtools_host__.js"
  let transformedDtHostBuild = ""
  let transformedDtClientBuild = ""

  const virtualModules: Record<string, string> = {}
  const fileToVirtualModules: Record<string, Set<string>> = {}
  let devServer: ViteDevServer | null = null
  let projectRoot = process.cwd().replace(/\\/g, "/")
  let includedPaths: string[] = []

  return {
    name: "vite-plugin-kaioken",
    // @ts-ignore
    resolveId(id) {
      if (virtualModules[id]) {
        return id
      }
    },
    load(id) {
      return virtualModules[id]
    },
    async buildStart() {
      const kaiokenPath = await this.resolve("kaioken")
      if (!kaiokenPath) {
        throw new Error(
          "[vite-plugin-kaioken]: Unable to resolve kaioken path."
        )
      }
      transformedDtHostBuild = devtoolsHostBuild.replaceAll(
        'from "kaioken"',
        `from "/@fs/${kaiokenPath!.id}"`
      )
      transformedDtClientBuild = devtoolsClientBuild.replaceAll(
        'from"kaioken";',
        `from"/@fs/${kaiokenPath!.id}";`
      )
    },
    config(config) {
      return {
        ...config,
        esbuild: {
          ...defaultEsBuildOptions,
          ...config.esbuild,
        },
      } as UserConfig
    },
    transformIndexHtml(html) {
      if (isProduction || isBuild || opts?.devtools === false) return
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: dtHostScriptPath,
            },
          },
        ],
      } satisfies IndexHtmlTransformResult
    },
    configResolved(config) {
      isProduction = config.isProduction
      isBuild = config.command === "build"
      projectRoot = config.root.replace(/\\/g, "/")
      includedPaths = (opts?.include ?? []).map((p) =>
        path.resolve(projectRoot, p).replace(/\\/g, "/")
      )
    },
    configureServer(server) {
      if (isProduction || isBuild) return
      if (opts?.devtools !== false) {
        server.middlewares.use(dtHostScriptPath, (_, res) => {
          res.setHeader("Content-Type", "application/javascript")
          res.end(transformedDtHostBuild, "utf-8")
        })
        server.middlewares.use(dtClientPathname, (_, res) => {
          res.end(transformedDtClientBuild)
        })
      }
      devServer = server
    },
    transform(src, id, options) {
      const isVirtual = !!virtualModules[id]
      if (!isVirtual) {
        if (
          id.startsWith("\0") ||
          id.startsWith("vite:") ||
          id.includes("/node_modules/")
        )
          return { code: src }

        if (!/\.[cm]?[jt]sx?$/.test(id)) return { code: src }

        const filePath = path.resolve(id).replace(/\\/g, "/")
        const isIncludedByUser = includedPaths.some((p) =>
          filePath.startsWith(p)
        )

        if (!isIncludedByUser && !filePath.startsWith(projectRoot)) {
          return { code: src }
        }
      }

      const ast = this.parse(src)
      const code = new MagicString(src)

      if (!isProduction && !isBuild) {
        injectHMRContextPreamble(code, ast, fileLinkFormatter, id, isVirtual)
        // early return if no components or hotVars are found
        if (!code.hasChanged()) {
          return { code: src }
        }
      }

      if (!options?.ssr) {
        const { extraModules } = prepareHydrationBoundaries(code, ast, id)
        for (const key in extraModules) {
          ;(fileToVirtualModules[id] ??= new Set()).add(key)
          const mod = devServer!.moduleGraph.getModuleById(key)
          if (mod) {
            devServer!.moduleGraph.invalidateModule(
              mod,
              undefined,
              undefined,
              true
            )
          }
          virtualModules[key] = extraModules[key]
        }
      }

      const map = code.generateMap({
        source: id,
        file: `${id}.map`,
        includeContent: true,
      })

      return {
        code: code.toString(),
        map: map.toString(),
      }
    },
  } satisfies Plugin
}
