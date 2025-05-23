import { KaiokenError } from "./error.js"
import { Signal } from "./signals/base.js"

export function assertValidElementProps(vNode: Kaioken.VNode) {
  if ("children" in vNode.props && vNode.props.innerHTML) {
    throw new KaiokenError({
      message: "Cannot use both children and innerHTML on an element",
      vNode,
    })
  }

  for (const key in vNode.props) {
    if ("bind:" + key in vNode.props) {
      throw new KaiokenError({
        message: `Cannot use both bind:${key} and ${key} on an element`,
        vNode,
      })
    }
  }
}

export function isValidElementKeyProp(
  thing: unknown
): thing is string | number {
  return typeof thing === "string" || typeof thing === "number"
}

export function isValidElementRefProp(
  thing: unknown
): thing is Kaioken.Ref<any> {
  return (
    typeof thing === "function" ||
    (typeof thing === "object" && !!thing && "current" in thing) ||
    Signal.isSignal(thing)
  )
}
