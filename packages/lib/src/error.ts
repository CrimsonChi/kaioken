import { $KAIOKEN_ERROR } from "./constants.js"
import { __DEV__ } from "./env.js"
import { findParent, noop } from "./utils.js"

type KaiokenErrorOptions =
  | string
  | {
      message: string
      /** Used to indicate that the error is fatal and should crash the application */
      fatal?: boolean
      /** Used to generate custom node stack */
      vNode?: Kaioken.VNode
    }

export class KaiokenError extends Error {
  [$KAIOKEN_ERROR] = true
  /** Indicates whether the error is fatal and should crash the application */
  fatal?: boolean
  /** Present if vNode is provided */
  customNodeStack?: string
  constructor(optionsOrMessage: KaiokenErrorOptions) {
    const message =
      typeof optionsOrMessage === "string"
        ? optionsOrMessage
        : optionsOrMessage.message
    super(message)
    if (typeof optionsOrMessage !== "string") {
      if (optionsOrMessage?.vNode) {
        this.customNodeStack = captureErrorStack(optionsOrMessage.vNode)
      }
      this.fatal = optionsOrMessage?.fatal
    }
  }

  static isKaiokenError(error: unknown): error is KaiokenError {
    return (
      error instanceof Error && (error as KaiokenError)[$KAIOKEN_ERROR] === true
    )
  }
}

function captureErrorStack(vNode: Kaioken.VNode) {
  let n = vNode
  let componentFns: string[] = []
  while (n) {
    if (!n.parent) break // skip root node
    if (typeof n.type === "function") {
      componentFns.push(getComponentErrorDisplayText(n.type))
    } else if (typeof n.type === "string") {
      componentFns.push(n.type)
    }
    n = n.parent
  }
  const componentNode = (
    typeof vNode.type === "function"
      ? vNode
      : findParent(vNode, (n) => typeof n.type === "function")
  ) as (Kaioken.VNode & { type: Function }) | null
  return `The above error occurred in the <${getFunctionName(
    componentNode?.type || noop
  )}> component:

${componentFns.map((x) => `   at ${x}`).join("\n")}\n`
}

function getComponentErrorDisplayText(fn: Function) {
  let str = getFunctionName(fn)
  if (__DEV__) {
    const fileLink = getComponentFileLink(fn)
    if (fileLink) {
      str = `${str} (${fileLink})`
    }
  }
  return str
}

function getFunctionName(fn: Function) {
  return (fn as any).displayName ?? (fn.name || "Anonymous Function")
}

function getComponentFileLink(fn: Function) {
  return fn.toString().match(/\/\/ \[kaioken_devtools\]:(.*)/)?.[1] ?? null
}
