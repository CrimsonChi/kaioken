import type { ReadonlySignal, Signal as SignalClass } from "./signals"
import type {
  $CONTEXT,
  $CONTEXT_PROVIDER,
  $FRAGMENT,
  $HYDRATION_BOUNDARY,
} from "./constants"
import type { KiruGlobalContext } from "./globalContext"
import type {
  GlobalAttributes,
  HtmlElementAttributes,
  SvgElementAttributes,
  SvgGlobalAttributes,
  StyleObject,
  HtmlElementBindableProps,
  HTMLTagToElement,
  SVGTagToElement,
} from "./types.dom"
import { Signalable, SomeDom } from "./types.utils"
import type { AppContext } from "./appContext"

export type { ElementProps, StyleObject }

type ElementProps<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T]

type SignalableHtmlElementAttributes<Tag extends keyof HtmlElementAttributes> =
  {
    [K in keyof HtmlElementAttributes[Tag]]: Signalable<
      HtmlElementAttributes[Tag][K]
    >
  } & (Tag extends keyof HtmlElementBindableProps
    ? HtmlElementBindableProps[Tag]
    : {})
type SignalableSvgElementAttributes<Tag extends keyof SvgElementAttributes> = {
  [K in keyof SvgElementAttributes[Tag]]: Signalable<
    SvgElementAttributes[Tag][K]
  >
}
type SignalableAriaProps = {
  [K in keyof ARIAMixin]?: Signalable<ARIAMixin[K]>
}
type SignalableGlobalAttributes = {
  [K in keyof GlobalAttributes]: Signalable<GlobalAttributes[K]>
}
type SignalableSvgGlobalAttributes = {
  [K in keyof SvgGlobalAttributes]: Signalable<SvgGlobalAttributes[K]>
}

type ElementMap = {
  [Tag in keyof HtmlElementAttributes]: SignalableHtmlElementAttributes<Tag> &
    SignalableGlobalAttributes &
    SignalableAriaProps &
    Kiru.EventAttributes<HTMLTagToElement<Tag>> &
    JSX.ElementAttributes & {
      ref?:
        | Kiru.Ref<HTMLTagToElement<Tag>>
        | SignalClass<HTMLTagToElement<Tag> | null>
    }
} & {
  [Tag in keyof SvgElementAttributes]: SignalableSvgElementAttributes<Tag> &
    SignalableSvgGlobalAttributes &
    SignalableGlobalAttributes &
    SignalableAriaProps &
    Kiru.EventAttributes<SVGTagToElement<Tag>> &
    JSX.ElementAttributes & {
      ref?:
        | Kiru.Ref<SVGTagToElement<Tag>>
        | SignalClass<SVGTagToElement<Tag> | null>
    }
} & {
  [Tag in `${string}-${string}`]: Record<string, any>
}

declare global {
  interface Window {
    __kiru: KiruGlobalContext | undefined
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

    type PrimitiveChild = string | number | bigint | boolean | undefined | null

    type ElementKey = string | number

    type Element =
      | Element[]
      | Kiru.VNode
      | PrimitiveChild
      | Kiru.Signal<PrimitiveChild>

    type ElementAttributes = {
      key?: JSX.ElementKey
      children?: JSX.Children
      innerHTML?:
        | string
        | number
        | Kiru.Signal<string | number | null | undefined>
    }
  }
  namespace Kiru {
    type ProviderProps<T> = {
      value: T
      children?: JSX.Children | ((value: T) => JSX.Element)
    }
    type Context<T> = {
      [$CONTEXT]: true
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
    type InferProps<T> = T extends Kiru.FC<infer P> ? P : never

    type HookDevtoolsProvisions<T extends Record<string, any>> = {
      get: () => T
      set?: (value: T) => void
    }
    type Hook<T> = T & {
      cleanup?: () => void
      name?: string
      dev?: {
        /** Used to perform invalidation during HMR when the hook's arguments have changed */
        initialArgs?: any
        devtools?: HookDevtoolsProvisions<any>
      }
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

    type RenderMode = "dom" | "hydrate" | "string" | "stream"

    type StateSetter<T> = T | ((prev: T) => T)

    type Signal<T> = SignalClass<T> | ReadonlySignal<T>

    type ExoticSymbol =
      | typeof $FRAGMENT
      | typeof $CONTEXT_PROVIDER
      | typeof $HYDRATION_BOUNDARY

    type VNode = {
      app?: AppContext
      dom?: SomeDom
      lastChildDom?: SomeDom
      type: Function | ExoticSymbol | "#text" | (string & {})
      props: {
        [key: string]: any
        children?: unknown
        key?: JSX.ElementKey
        ref?: Kiru.Ref<unknown>
      }
      index: number
      depth: number
      parent: VNode | null
      child: VNode | null
      sibling: VNode | null
      prev: VNodeSnapshot | null
      deletions: VNode[] | null
      flags: number
      hooks?: Hook<unknown>[]
      subs?: Set<string>
      cleanups?: Record<string, Function>
      effects?: Array<Function>
      immediateEffects?: Array<Function>
      memoizedProps?: Record<string, any>
      isMemoized?: boolean
      arePropsEqual?: (
        prev: Record<string, any>,
        next: Record<string, any>
      ) => boolean
      // dev-mode only
      hookSig?: string[]
      hmrUpdated?: boolean
    }
  }
  type VNodeSnapshot = {
    props: Kiru.VNode["props"]
    memoizedProps: Kiru.VNode["memoizedProps"]
    index: number
  }

  interface Element {
    __kiruNode?: Kiru.VNode
  }
}
