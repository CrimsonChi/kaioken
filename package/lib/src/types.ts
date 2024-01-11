import { EffectTag } from "./constants"

declare global {
  namespace JSX {
    interface IntrinsicElements extends IntrinsicElementMap {}

    type FormElementProps = {
      [K in keyof HTMLElementTagNameMap["form"]]?: K extends "action"
        ? ((formData: FormData) => void) | string | undefined
        : HTMLElementTagNameMap["form"][K]
    }

    type BasicElementProps = {
      [K in keyof HTMLElementTagNameMap]: K extends "form"
        ? FormElementProps
        :
            | {
                [P in keyof HTMLElementTagNameMap[K]]?:
                  | HTMLElementTagNameMap[K][P]
                  | string
                  | number
              }
    }

    type BasicSVGElementProps = {
      [K in keyof SVGElementTagNameMap]:
        | {
            [P in keyof SVGElementTagNameMap[K]]?:
              | SVGElementTagNameMap[K][P]
              | string
              | number
          }
    }

    type InternalElementProps<K> = K extends keyof HTMLElementTagNameMap
      ? {
          ref?: Ref<HTMLElementTagNameMap[K]>
          children?: Element[]
        }
      : {}

    type IntrinsicElementMap = {
      [K in keyof HTMLElementTagNameMap]: InternalElementProps<K> &
        BasicElementProps[K]
    } & {
      [K in keyof SVGElementTagNameMap]: BasicSVGElementProps[K]
    }

    type Element = string | Node | VNode | VNode[]
  }
}

export type VNode = {
  type?: string | Function
  props: {
    [key: string]: any
    children: VNode[]
  }
  parent?: VNode
  child?: VNode
  sibling?: VNode
  prev?: VNode
  effectTag?: EffectTag
  hooks: any[]
  dt?: number
}

export type Rec = Record<string, any>

export interface RouteChildProps {
  params: Rec
  query: Rec
}

export type Ref<T> = { current: T | null }

export type Context<T> = {
  Provider: ({ value, children }: ProviderProps<T>) => JSX.Element
  value: () => T
}

export type ProviderProps<T> = {
  value: T
  children?: JSX.Element[]
}

export type ElementProps<T extends keyof JSX.BasicElementProps> =
  JSX.IntrinsicElements[T]
