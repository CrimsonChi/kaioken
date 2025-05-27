import type { $CONTEXT_PROVIDER } from "./constants"
import type { Signal } from "./signals"

export type SomeElement = HTMLElement | SVGElement
export type SomeDom = HTMLElement | SVGElement | Text
export type MaybeDom = SomeDom | undefined

type VNode = Kaioken.VNode

export type FunctionVNode = Omit<VNode, "type"> & {
  type: (...args: any) => any
}
export type ExoticVNode = Omit<VNode, "type"> & {
  type: Kaioken.ExoticSymbol
}
export type ElementVNode = Omit<VNode, "dom" | "type"> & {
  dom: SomeElement
  type: string
}
export type DomVNode = Omit<VNode, "dom" | "type"> & {
  dom: SomeDom
  type: "#text" | (string & {})
}

export type ContextProviderNode<T> = Kaioken.VNode & {
  type: typeof $CONTEXT_PROVIDER
  props: { value: T; ctx: Kaioken.Context<T>; dependents: Set<Kaioken.VNode> }
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Signalable<T> = T | Signal<T>
