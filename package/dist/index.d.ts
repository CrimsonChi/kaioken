import type { ComponentState, Component, JSXTag, IComponentDefinition, ComponentProps } from "./types";
export declare class ReflexDOM {
    private static instance;
    private components;
    private updateQueued;
    private _app?;
    get root(): string | Node | null | undefined;
    get app(): Component | undefined;
    set app(app: Component | undefined);
    static mount(root: Element, appFunc: (props: ComponentProps) => Component): ReflexDOM | undefined;
    static getInstance(): ReflexDOM;
    private queueUpdate;
    private update;
    private createStateProxy;
    registerComponent(component: Component): void;
}
export declare function defineComponent<T extends ComponentState, U extends ComponentProps>(defs: IComponentDefinition<T, U>): (props: U) => Component<T, U>;
export declare function h(tag: JSXTag, props?: Record<string, unknown> | null, ...children: unknown[]): JSX.Element | null;
