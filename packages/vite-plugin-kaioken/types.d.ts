import type { Plugin } from "vite"
export interface KaiokenPluginOptions {
  devtools?: boolean
}
export default function kaioken(opts?: KaiokenPluginOptions): Plugin
