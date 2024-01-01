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
          }
    }

    type Element = string | Node | VNode
  }
}

export type VNode = {
  type?: string | Function
  props: {
    [key: string]: any
    children: VNode[]
  }
  dom?: HTMLElement | Text
  parent?: VNode
  child?: VNode
  sibling?: VNode
  alternate?: VNode
  effectTag?: string
  hooks: any[]
}

export type Rec = Record<string, any>

export interface RouteChildProps {
  params: Rec
  query: Rec
}
