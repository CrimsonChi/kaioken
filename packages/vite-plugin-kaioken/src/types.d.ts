import type { Plugin } from "vite"

export type FileLinkFormatter = (path: string, line: number) => string

export interface DevtoolsOptions {
  /**
   * Specifies the path to the devtools app displayed via popup
   * @default "/__devtools__"
   */
  pathname?: string

  /**
   * Formats the link displayed in devtools to the component's source code
   * @param path the path to the file that contains the component on disk
   * @param line the component's line number
   * @returns {string} the formatted link
   * @default (path, line) => `vscode://file/${path}:${line}`
   */
  formatFileLink?: FileLinkFormatter
}

export interface KaiokenPluginOptions {
  /**
   * Specifies whether the devtools should be injected into the build during development
   * @default true
   */
  devtools?: boolean | DevtoolsOptions

  /**
   * Specifies extra paths to be considered for HMR injection
   * @example ['../path/to/components/']
   */
  include?: string[]
}

export default function kaioken(opts?: KaiokenPluginOptions): Plugin
