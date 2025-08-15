import { KiruError } from "./error.js"
import { Signal } from "./signals/index.js"

export function assertValidElementProps(vNode: Kiru.VNode) {
  if ("children" in vNode.props && vNode.props.innerHTML) {
    throw new KiruError({
      message: "Cannot use both children and innerHTML on an element",
      vNode,
    })
  }

  for (const key in vNode.props) {
    if ("bind:" + key in vNode.props) {
      throw new KiruError({
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

export function isValidElementRefProp(thing: unknown): thing is Kiru.Ref<any> {
  return (
    typeof thing === "function" ||
    (typeof thing === "object" && !!thing && "current" in thing) ||
    Signal.isSignal(thing)
  )
}
