import { contextProviderSymbol, fragmentSymbol } from "./constants"

export type SomeElement = HTMLElement | SVGElement
export type SomeDom = HTMLElement | SVGElement | Text
export type MaybeDom = SomeDom | undefined

type VNode = Kaioken.VNode

export type FunctionVNode = VNode & { type: (...args: any) => any }
export type ExoticVNode = VNode & {
  type: typeof contextProviderSymbol | typeof fragmentSymbol
}
export type ElementVNode = VNode & { dom: SomeElement }
export type DomVNode = VNode & { dom: SomeDom }

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
