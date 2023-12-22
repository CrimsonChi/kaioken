import { str_internal } from "./constants";
export type ComponentState = Record<string, unknown>;
export type ComponentProps = {
    [key: string]: any;
} | null;
export type Component<T extends ComponentState = any, U extends ComponentProps = any> = IComponentDefinition<T, U> & {
    state: T;
    node?: string | Node | null;
    parent?: Component;
    dirty?: boolean;
    [str_internal]: true;
};
export interface IComponentDefinition<T extends ComponentState, U extends ComponentProps> {
    state?: T;
    init?: ComponentInitFunction<T, U>;
    render: ComponentRenderFunction<T, U>;
}
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [key: string]: any;
        }
        interface ElementAttributesProperty {
            props: {};
        }
        interface ElementChildrenAttribute {
            children: {};
        }
        interface IntrinsicAttributes {
            [key: string]: any;
        }
        interface IntrinsicClassAttributes<T> {
            [key: string]: any;
        }
        type Element = string | Node | Component;
    }
}
export type JSXTag = string | ((props: any, children: unknown[]) => Component);
type ComponentRenderFunction<T extends ComponentState, U extends ComponentProps> = (props: {
    state: T;
    props: U;
}) => JSX.Element | null;
type ComponentCleanupFunction<T extends ComponentState, U extends ComponentProps> = (props: {
    state: T;
    props: U;
}) => void;
type ComponentInitFunction<T extends ComponentState, U extends ComponentProps> = (props: {
    state: T;
    props: U;
}) => ComponentCleanupFunction<T, U> | void | Promise<ComponentCleanupFunction<T, U>> | Promise<void>;
export {};
