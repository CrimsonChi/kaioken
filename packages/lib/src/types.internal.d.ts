type SomeElement = HTMLElement | SVGElement
type SomeDom = HTMLElement | SVGElement | Text
type MaybeDom = SomeDom | undefined

type VNode = Kaioken.VNode

type FunctionVNode = VNode & { type: (...args: any) => any }
type ExoticVNode = VNode & {
  type: typeof fragmentSymbol | typeof contextProviderSymbol
}
type ElementVNode = VNode & { dom: SomeElement }
type DomVNode = VNode & { dom: SomeDom }

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
