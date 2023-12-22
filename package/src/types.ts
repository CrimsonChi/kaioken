import { str_internal } from "./constants"

export type ComponentState = Record<string, unknown>

export type Component<T extends ComponentState = any> =
  IComponentDefinition<T> & {
    state: T
    node?: string | Node | null
    parent?: Component
    dirty?: boolean
    [str_internal]: true
  }

export interface IComponentDefinition<T extends ComponentState> {
  state?: T
  init?: ComponentInitFunction<T>
  render: ComponentRenderFunction<T>
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

type ComponentRenderFunction<T extends ComponentState> = (props: {
  state: T
}) => JSX.Element | null

type ComponentCleanupFunction<T extends ComponentState> = (props: {
  state: T
}) => void

type ComponentInitFunction<T extends ComponentState> = (props: {
  state: T
}) =>
  | ComponentCleanupFunction<T>
  | void
  | Promise<ComponentCleanupFunction<T>>
  | Promise<void>
