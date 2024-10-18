import type { $CONTEXT_PROVIDER } from "./constants"

export type SomeElement = HTMLElement | SVGElement
export type SomeDom = HTMLElement | SVGElement | Text
export type MaybeDom = SomeDom | undefined

type VNode = Kaioken.VNode

export type FunctionVNode = VNode & { type: (...args: any) => any }
export type ExoticVNode = VNode & {
  type: Kaioken.ExoticSymbol
}
export type ElementVNode = VNode & { dom: SomeElement }
export type DomVNode = VNode & { dom: SomeDom }

export type ContextProviderNode<T> = Kaioken.VNode & {
  type: typeof $CONTEXT_PROVIDER
  props: { value: T; ctx: Kaioken.Context<T> }
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
