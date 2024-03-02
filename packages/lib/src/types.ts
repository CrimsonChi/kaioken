import { Component } from "./component"
import type { EffectTag } from "./constants"
import type {
  EventAttributes,
  GlobalAttributes,
  HtmlElementAttributes,
  SvgElementAttributes,
  SvgGlobalAttributes,
} from "./types.dom"

export type { ElementProps }

type ElementProps<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T] & {
    children?: JSX.Element[]
  }

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

    type Element = Kaioken.VNode | Kaioken.VNode[] | string | number | null

    type InternalProps<
      K extends keyof HtmlElementAttributes | keyof SvgElementAttributes,
    > = K extends keyof HTMLElementTagNameMap
      ? { ref?: Kaioken.Ref<HTMLElementTagNameMap[K]> }
      : K extends keyof SVGElementTagNameMap
        ? { ref?: Kaioken.Ref<SVGElementTagNameMap[K]> }
        : {}
  }

  export namespace Kaioken {
    type Context<T> = {
      Provider: ({ value, children }: ProviderProps<T>) => JSX.Element
      value: () => T
    }

    type FC<T = {}> = (props: FCProps<T>) => JSX.Element
    type FCProps<T = {}> = T & { children?: JSX.Element[] }

    type Hook<T> = T & { cleanup?: () => void }

    type Ref<T> = { current: T | null }

    type StateSetter<T> = T | ((prev: T) => T)

    type ProviderProps<T> = {
      value: T
      children?: JSX.Element[]
    }

    type VNode = {
      type: string | Function | typeof Component
      dom?: HTMLElement | SVGElement | Text
      instance?: Component
      props: {
        [key: string]: any
        children: VNode[]
      }
      hooks?: Hook<unknown>[]
      parent?: VNode
      child?: VNode
      sibling?: VNode
      prev?: VNode
      effectTag?: (typeof EffectTag)[keyof typeof EffectTag]
      dt?: number
    }
  }
}
