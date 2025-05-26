import type {
  ESBuildOptions,
  IndexHtmlTransformResult,
  Plugin,
  UserConfig,
  ViteDevServer,
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
  const tsxOrJsxRegex = /\.(tsx|jsx)$/
  const tsOrJsRegex = /\.(ts|js)$/
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

  let _config: UserConfig | null = null
  const virtualModules: Record<string, string> = {}
  const virtualModuleDependents: Record<string, Set<string>> = {}
  let devServer: ViteDevServer | null = null
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
      return (_config = {
        ...config,
        esbuild: {
          ...defaultEsBuildOptions,
          ...config.esbuild,
        },
      } as UserConfig)
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
    },
    configureServer(server) {
      devServer = server
      if (isProduction || isBuild || opts?.devtools === false) return
      server.middlewares.use(dtHostScriptPath, (_, res) => {
        res.setHeader("Content-Type", "application/javascript")
        res.end(transformedDtHostBuild, "utf-8")
      })
      server.middlewares.use(dtClientPathname, (_, res) => {
        res.end(transformedDtClientBuild)
      })
    },
    handleHotUpdate(ctx) {
      console.log("handleHotUpdate", ctx.file)
    },
    transform(code, id, options) {
      const isVirtual = !!virtualModules[id]
      if (isVirtual) {
      } else {
        if (!tsxOrJsxRegex.test(id) && !tsOrJsRegex.test(id)) return { code }
        const projectRoot = path.resolve(_config?.root ?? process.cwd())
        const filePath = path.resolve(id)
        if (!filePath.startsWith(projectRoot)) {
          return { code }
        }
      }

      console.log("transform", id)

      const ast = this.parse(code)
      const asMagicStr = new MagicString(code)

      if (!isProduction && !isBuild) {
        // early return if no components or hotVars are found
        if (
          !injectHMRContextPreamble(
            asMagicStr,
            ast,
            fileLinkFormatter,
            id,
            isVirtual
          )
        ) {
          return { code }
        }
      }

      if (!options?.ssr) {
        const { extraModules } = prepareHydrationBoundaries(asMagicStr, ast, id)
        for (const key in extraModules) {
          //const didExist = !!virtualModules[key]
          const didExist = !!virtualModules[key]
          virtualModules[key] = extraModules[key]
          if (didExist && !key.endsWith("_loader")) {
            const module = devServer!.moduleGraph.getModuleById(key)!
            devServer!.reloadModule(module)
          }
          // virtualModuleDependents[id] ??= new Set()
          // virtualModuleDependents[id].add(key)

          // if (didExist) {
          //   console.log("updating virtual module", key)
          //   const module = devServer?.moduleGraph.getModuleById(key)
          //   if (module) {
          //     devServer?.moduleGraph.invalidateModule(
          //       module,
          //       undefined,
          //       undefined,
          //       true
          //     )
          //   } else {
          //     console.log("module not found", key)
          //   }
          // }
        }
      }

      const map = asMagicStr.generateMap({
        source: id,
        file: `${id}.map`,
        includeContent: true,
      })

      return {
        code: asMagicStr.toString(),
        map: map.toString(),
      }
    },
  } satisfies Plugin
}
