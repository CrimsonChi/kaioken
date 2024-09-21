import { KaiokenError } from "./error.js"
import { Signal } from "./signal.js"

export function assertValidElementProps(vNode: Kaioken.VNode) {
  if ("children" in vNode.props && vNode.props.innerHTML) {
    throw new KaiokenError(
      "[kaioken]: Cannot use both children and innerHTML on an element"
    )
  }
}

export function isValidElementKeyProp(
  value: unknown
): value is string | number {
  return typeof value === "string" || typeof value === "number"
}

export function isValidElementRefProp(
  value: unknown
): value is Kaioken.Ref<any> {
  return (
    typeof value === "function" ||
    (typeof value === "object" && !!value && "current" in value) ||
    Signal.isSignal(value)
  )
}
