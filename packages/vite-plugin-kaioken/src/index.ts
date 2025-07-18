import {
  type ESBuildOptions,
  type IndexHtmlTransformResult,
  type Plugin,
  type UserConfig,
} from "vite"
import devtoolsClientBuild from "kaioken-devtools-client"
import devtoolsHostBuild from "kaioken-devtools-host"
import { MagicString } from "./codegen/shared.js"
import path from "node:path"
import {
  prepareDevOnlyHooks,
  prepareHotVars,
  prepareHydrationBoundaries,
} from "./codegen"
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

  let fileLinkFormatter: FileLinkFormatter = (path: string, line: number) =>
    `vscode://file/${path}:${line}`

  let dtClientPathname = "/__devtools__"
  if (typeof opts?.devtools === "object") {
    dtClientPathname = opts.devtools.pathname ?? dtClientPathname
    fileLinkFormatter = opts.devtools.formatFileLink ?? fileLinkFormatter
  }
  const dtHostScriptPath = "/__devtools_host__.js"
  let transformedDtHostBuild = ""
  let transformedDtClientBuild = ""

  const virtualModules: Record<string, string> = {}
  const fileToVirtualModules: Record<string, Set<string>> = {}
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
            children: `window.__KAIOKEN_DEVTOOLS_PATHNAME__ = "${dtClientPathname}";`,
          },
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
      server.watcher.on("change", (file) => {
        const filePath = path.resolve(file).replace(/\\/g, "/")
        const affectedVirtualModules = fileToVirtualModules[filePath]
        if (affectedVirtualModules) {
          for (const modId of affectedVirtualModules) {
            const mod = server.moduleGraph.getModuleById(modId)
            if (mod) {
              server!.moduleGraph.invalidateModule(
                mod,
                undefined,
                undefined,
                true
              )
              // virtualModules[modId] = "" // optional: clear stale content
            }
          }
        }

        // find & invalidate virtual modules that import this
        // to be investigated: do we also need to invalidate
        // the file that the virtual is derived from?
        const mod = server.moduleGraph.getModuleById(file)
        if (mod) {
          mod.importers.forEach((importer) => {
            if (importer.id && virtualModules[importer.id]) {
              server!.moduleGraph.invalidateModule(
                importer,
                undefined,
                undefined,
                true
              )
            }
          })
        }
      })
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

      prepareDevOnlyHooks(code, ast, isBuild)

      if (!isProduction && !isBuild) {
        prepareHotVars(code, ast, fileLinkFormatter, id, isVirtual)
      }

      if (!options?.ssr) {
        const { extraModules } = prepareHydrationBoundaries(code, ast, id)
        for (const key in extraModules) {
          ;(fileToVirtualModules[id] ??= new Set()).add(key)
          virtualModules[key] = extraModules[key]
        }
      }

      if (!code.hasChanged()) {
        return { code: src }
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

// @ts-ignore
export function onHMR(callback: () => void) {}
