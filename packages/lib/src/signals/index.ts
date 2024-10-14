/**
 * ISSUES:
 * 1. signal subscription when mixing local and global signals get reversed in hmr for ONLY the first update after HMR is dom
 * 2. global computed will lose its vNode subscription on HMR
 *
 * */

export { Signal, signal } from "./base.js"
export { watch } from "./watch.js"
export { computed } from "./computed.js"
export { unwrap, tick } from "./utils.js"
export * from "./types.js"
