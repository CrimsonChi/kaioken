declare global {
  namespace JSX {
    interface IntrinsicElements extends IntrinsicElementMap {}

    type IntrinsicElementMap = {
      [K in keyof HTMLElementTagNameMap]:
        | {
            [P in keyof HTMLElementTagNameMap[K]]?:
              | HTMLElementTagNameMap[K][P]
              | string
              | number
          } & {
            ref?: Ref<HTMLElementTagNameMap[K]>
          }
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
  T extends string extends keyof JSX.IntrinsicElements
    ? string
    : keyof JSX.IntrinsicElements
> = JSX.IntrinsicElements[T] & {
  children?: JSX.Element[]
}
