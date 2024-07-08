import type { Signal as SignalClass } from "./signal"
import type { Component } from "./component"
import type { EffectTag } from "./constants"
import type { KaiokenGlobalContext } from "./globalContext"
import type {
  EventAttributes,
  GlobalAttributes,
  HtmlElementAttributes,
  SvgElementAttributes,
  SvgGlobalAttributes,
} from "./types.dom"
import type { AppContext } from "./appContext"

export type { ElementProps }

type BaseElement = Element

type ElementProps<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T]

type ElementMap = {
  [K in keyof HtmlElementAttributes]: HtmlElementAttributes[K] &
    GlobalAttributes &
    EventAttributes<K> &
    Partial<ARIAMixin> &
    JSX.ElementAttributes
} & {
  [K in keyof SvgElementAttributes]: SvgElementAttributes[K] &
    SvgGlobalAttributes &
    GlobalAttributes &
    EventAttributes<K> &
    Partial<ARIAMixin> &
    JSX.ElementAttributes
}

declare global {
  interface Window {
    __kaioken: KaiokenGlobalContext | undefined
  }
  namespace JSX {
    interface IntrinsicElements extends ElementMap {}

    interface IntrinsicAttributes {
      key?: ElementKey
    }

    interface ElementAttributesProperty {
      props: {}
    }
    interface ElementChildrenAttribute {
      children: {}
    }

    type Children = JSX.Element | JSX.Element[]

    type ElementKey = string | number
    type Element =
      | Element[]
      | Kaioken.VNode
      | string
      | number
      | null
      | boolean
      | undefined
      | Kaioken.Signal<any>

    type ElementAttributes = {
      ref?: Kaioken.Ref<BaseElement | null>
      key?: JSX.ElementKey
      children?: JSX.Children
      innerHTML?: string | number | Kaioken.Signal<string | number>
    }
  }
  export namespace Kaioken {
    type ProviderProps<T> = {
      value: T
      children?: JSX.Children
    }
    type Context<T> = {
      Provider: ({ value, children }: ProviderProps<T>) => JSX.Element
      default: () => T
    }

    type FC<T = {}> = (props: FCProps<T>) => JSX.Element
    type FCProps<T = {}> = T & { children?: JSX.Children }

    type Hook<T> = T & {
      cleanup?: () => void
      debug?: () => Record<string, any>
      name?: string
    }

    type Ref<T> = { current: T }

    type StateSetter<T> = T | ((prev: T) => T)

    type Signal<T> = SignalClass<T>

    type VNode = {
      type: string | Function | typeof Component
      dom?: HTMLElement | SVGElement | Text
      instance?: Component
      props: {
        [key: string]: any
        children?: unknown[]
        key?: JSX.ElementKey
        ref?: Kaioken.Ref<unknown>
      }
      ctx: AppContext
      index: number
      hooks?: Hook<unknown>[]
      subs?: Signal<any>[]
      parent?: VNode
      child?: VNode
      sibling?: VNode
      prev?: VNode
      effectTag?: (typeof EffectTag)[keyof typeof EffectTag]
      frozen?: boolean
    }
  }
}
