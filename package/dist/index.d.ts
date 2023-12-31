import type { ComponentState, Component, JSXTag, IComponentDefinition, ComponentProps } from "./types";
export declare class ReflexDOM {
    private static instance;
    private updateQueued;
    private updateQueue;
    private _root?;
    private app?;
    private _renderStack;
    get root(): Element | null | undefined;
    get renderStack(): Component[];
    static mount(root: Element, appFunc: (props: ComponentProps, children: unknown[]) => Component): ReflexDOM | undefined;
    static getInstance(): ReflexDOM;
    static queueUpdate(component: Component): void;
    private update;
}
export declare function defineComponent<T extends ComponentState, U extends ComponentProps>(defs: IComponentDefinition<T, U>): (props: U, children: unknown[]) => Component<T, U>;
export declare function h(tag: JSXTag, props?: Record<string, unknown> | null, ...children: unknown[]): JSX.Element | null;
