import { str_internal } from "./constants"

export type ComponentState = Record<string, unknown>
export type ComponentProps = { [key: string]: any } | null

export type Component<
  T extends ComponentState = any,
  U extends ComponentProps = any
> = IComponentDefinition<T, U> & {
  state: T
  props: U
  node?: string | Node | null
  dirty?: boolean
  destroy?: ComponentFunc<T, U, void>
  [str_internal]: true
}

export interface IComponentDefinition<
  T extends ComponentState,
  U extends ComponentProps
> {
  state?: T
  init?: ComponentFunc<T, U, ComponentFunc<T, U, void> | void>
  render: ComponentFunc<T, U, JSX.Element | null>
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any
    }

    interface ElementAttributesProperty {
      props: {}
    }

    interface ElementChildrenAttribute {
      children: {}
    }

    interface IntrinsicAttributes {
      [key: string]: any
    }

    interface IntrinsicClassAttributes<T> {
      [key: string]: any
    }

    type Element = string | Node | Component
  }
}

export type JSXTag = string | ((props: any, children: unknown[]) => Component)

export type ComponentFunc<
  T extends ComponentState,
  U extends ComponentProps,
  V extends unknown
> = (props: { state: T; props: U }) => V

export type NodeToComponentMap = WeakMap<Node, Component>
export type ComponentToNodeMap = WeakMap<Component, Node | null>
export type ComponentToChildrenMap = WeakMap<Component, Component[]>
