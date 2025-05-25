import type { $CONTEXT_PROVIDER, $HYDRATION_BOUNDARY } from "./constants"
import type { HydrationBoundaryMode } from "./ssr/hydrationBoundary"
import type { Signal } from "./signals"

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
  props: { value: T; ctx: Kaioken.Context<T>; dependents: Set<Kaioken.VNode> }
}
export type HydrationBoundaryNode = Kaioken.VNode & {
  type: typeof $HYDRATION_BOUNDARY
  props: { mode: HydrationBoundaryMode }
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Signalable<T> = T | Signal<T>
