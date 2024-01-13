import { Component } from "./component"
import type { EffectTag } from "./constants"
import type {
  EventAttributes,
  GlobalAttributes,
  HtmlElementAttributes,
  SvgElementAttributes,
  SvgGlobalAttributes,
} from "./types.dom"

export type { VNode, Rec, Ref, Context, ProviderProps, ElementProps, Hook }

type ElementMap = {
  [K in keyof HtmlElementAttributes]: HtmlElementAttributes[K] &
    GlobalAttributes &
    EventAttributes<K> &
    JSX.InternalProps<K> &
    Partial<ARIAMixin>
} & {
  [K in keyof SvgElementAttributes]: SvgElementAttributes[K] &
    SvgGlobalAttributes &
    GlobalAttributes &
    EventAttributes<K> &
    JSX.InternalProps<K> &
    Partial<ARIAMixin>
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ElementMap {}

    type Element = VNode | VNode[] | string | number | null

    type InternalProps<
      K extends keyof HtmlElementAttributes | keyof SvgElementAttributes
    > = {
      children?: Element[]
    } & (K extends keyof HTMLElementTagNameMap
      ? { ref?: Ref<HTMLElementTagNameMap[K]> }
      : K extends keyof SVGElementTagNameMap
      ? { ref?: Ref<SVGElementTagNameMap[K]> }
      : {})
  }
}

type VNode = {
  id: number
  type: string | Function | typeof Component
  instance?: Component
  props: {
    [key: string]: any
    children: VNode[]
  }
  parent?: VNode
  child?: VNode
  sibling?: VNode
  prev?: VNode
  effectTag?: EffectTag
  dt?: number
}

type Rec = Record<string, any>

type Ref<T> = { current: T | null }

type Context<T> = {
  Provider: ({ value, children }: ProviderProps<T>) => JSX.Element
  value: () => T
}

type ProviderProps<T> = {
  value: T
  children?: JSX.Element[]
}

type ElementProps<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T]

type Hook<T> = T & { cleanup?: () => void }
