import type {
  ReadonlySignal,
  Signal as SignalClass,
  SignalLike,
} from "./signal"
import type { contextProviderSymbol, fragmentSymbol } from "./constants"
import type { KaiokenGlobalContext } from "./globalContext"
import type {
  EventAttributes,
  GlobalAttributes,
  GlobalEventAttributes,
  HtmlElementAttributes,
  SomeDom,
  SvgElementAttributes,
  SvgGlobalAttributes,
  StyleObject,
} from "./types.dom"

export type { ElementProps, StyleObject, Prettify }

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type HTMLTagToElement<T extends keyof HtmlElementAttributes> =
  T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : T extends keyof HTMLElementDeprecatedTagNameMap
      ? HTMLElementDeprecatedTagNameMap[T]
      : never

type SVGTagToElement<T extends keyof SvgElementAttributes> =
  T extends keyof SVGElementTagNameMap ? SVGElementTagNameMap[T] : never

type ElementProps<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T]

type WebComponentTag = `${string}-${string}`

type SignalableHtmlElementAttributes<Tag extends keyof HtmlElementAttributes> =
  {
    [K in keyof HtmlElementAttributes[Tag]]:
      | SignalLike<HtmlElementAttributes[Tag][K]>
      | HtmlElementAttributes[Tag][K]
  }
type SignalableSvgElementAttributes<Tag extends keyof SvgElementAttributes> = {
  [K in keyof SvgElementAttributes[Tag]]:
    | SvgElementAttributes[Tag][K]
    | SignalLike<SvgElementAttributes[Tag][K]>
}
type SignalableAriaProps = {
  [K in keyof ARIAMixin]?: ARIAMixin[K] | SignalLike<ARIAMixin[K]>
}
type SignalableGlobalAttributes = {
  [K in keyof GlobalAttributes]:
    | GlobalAttributes[K]
    | SignalLike<GlobalAttributes[K]>
}
type SignalableSvgGlobalAttributes = {
  [K in keyof SvgGlobalAttributes]:
    | SvgGlobalAttributes[K]
    | SignalLike<SvgGlobalAttributes[K]>
}

type ElementMap = {
  [Tag in keyof HtmlElementAttributes]: SignalableHtmlElementAttributes<Tag> &
    SignalableGlobalAttributes &
    SignalableAriaProps &
    EventAttributes<Tag> &
    GlobalEventAttributes &
    JSX.ElementAttributes & {
      ref?:
        | Kaioken.Ref<HTMLTagToElement<Tag>>
        | SignalClass<HTMLTagToElement<Tag> | null>
    }
} & {
  [Tag in keyof SvgElementAttributes]: SignalableSvgElementAttributes<Tag> &
    SignalableSvgGlobalAttributes &
    SignalableGlobalAttributes &
    SignalableAriaProps &
    EventAttributes<Tag> &
    GlobalEventAttributes &
    JSX.ElementAttributes & {
      ref?:
        | Kaioken.Ref<SVGTagToElement<Tag>>
        | SignalClass<SVGTagToElement<Tag> | null>
    }
} & {
  [Tag in WebComponentTag]: Record<string, any>
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

    type ElementKey = string | number | null | undefined
    type Element =
      | Element[]
      | Kaioken.VNode
      | string
      | number
      | null
      | boolean
      | undefined
      | Kaioken.Signal<string | number | null | undefined>

    type ElementAttributes = {
      key?: JSX.ElementKey
      children?: JSX.Children
      innerHTML?:
        | string
        | number
        | Kaioken.Signal<string | number | null | undefined>
    }
  }
  export namespace Kaioken {
    type ProviderProps<T> = {
      value: T
      children?: JSX.Children | ((value: T) => JSX.Element)
    }
    type Context<T> = {
      Provider: (({ value, children }: ProviderProps<T>) => JSX.Element) & {
        displayName?: string
      }
      default: () => T
      /** Used to display the name of the context in devtools  */
      displayName?: string
    }

    type FC<T = {}> = ((props: FCProps<T>) => JSX.Element) & {
      /** Used to display the name of the component in devtools  */
      displayName?: string
    }
    type FCProps<T = {}> = T & { children?: JSX.Children }
    type InferProps<T> = T extends Kaioken.FC<infer P> ? P : never

    interface HookDebug<T extends Record<string, any>> {
      get: () => T
      set?: (value: ReturnType<this["get"]>) => void
    }
    type Hook<T> = T & {
      cleanup?: () => void
      debug?: HookDebug<any>
      name?: string
    }
    type RefObject<T> = {
      readonly current: T | null
    }
    type MutableRefObject<T> = {
      current: T
    }
    type RefCallback<T> = {
      bivarianceHack(instance: T | null): void
    }["bivarianceHack"]

    type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined

    type StateSetter<T> = T | ((prev: T) => T)

    type Signal<T> = SignalClass<T> | ReadonlySignal<T>

    type ExoticSymbol = typeof fragmentSymbol | typeof contextProviderSymbol

    type VNode = {
      type: string | Function | ExoticSymbol
      dom?: SomeDom
      props: {
        [key: string]: any
        children?: unknown
        key?: JSX.ElementKey
        ref?: Kaioken.Ref<unknown>
      }
      index: number
      depth: number
      hooks?: Hook<unknown>[]
      subs?: Signal<any>[]
      cleanups?: Record<string, Function>
      parent?: VNode
      child?: VNode
      sibling?: VNode
      prev?: VNode
      flags: number
      frozen?: boolean
      effects?: Array<Function>
      immediateEffects?: Array<Function>
      prevStyleStr?: string
      prevStyleObj?: StyleObject
    }
  }

  interface Element {
    __kaiokenNode?: Kaioken.VNode
  }
}
