declare global {
  namespace JSX {
    interface IntrinsicElements extends IntrinsicElementMap {}

    type BasicElementProps = {
      [K in keyof HTMLElementTagNameMap]:
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

    type FormElementProps = Omit<ElementProps<"form">, "action"> & {
      action?: ElementProps<"form">["action"] | ((formData: FormData) => void)
    }

    type IntrinsicElementMap = {
      [K in keyof HTMLElementTagNameMap]: K extends "form"
        ? FormElementProps
        : ElementProps<K>
    } & {
      [K in keyof SVGElementTagNameMap]: SVGElementProps<K>
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
  dom?: HTMLElement | SVGElement | Text
  parent?: VNode
  child?: VNode
  sibling?: VNode
  prev?: VNode
  effectTag?: string
  hooks: any[]
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

export type ElementProps<
  T extends string extends keyof JSX.BasicElementProps
    ? string
    : keyof JSX.BasicElementProps
> = JSX.BasicElementProps[T] & {
  children?: JSX.Element[]
}

export type SVGElementProps<
  T extends string extends keyof JSX.BasicSVGElementProps
    ? string
    : keyof JSX.BasicSVGElementProps
> = JSX.BasicSVGElementProps[T] & {
  children?: JSX.Element[]
}
