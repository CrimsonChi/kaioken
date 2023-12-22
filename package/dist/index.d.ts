import type { ComponentState, Component, JSXTag, IComponentDefinition } from "./types";
export declare class ReflexDOM {
    private static instance;
    private components;
    private updateQueued;
    private _app?;
    get root(): string | Node | null | undefined;
    get app(): Component | undefined;
    set app(app: Component | undefined);
    static mount(root: Element, appFunc: () => Component): ReflexDOM | undefined;
    static getInstance(): ReflexDOM;
    private queueUpdate;
    private update;
    private createStateProxy;
    registerComponent(component: Component): void;
}
export declare function defineComponent<T extends ComponentState>(args: IComponentDefinition<T>): () => Component<T>;
export declare function h(tag: JSXTag, props?: Record<string, unknown> | null, ...children: unknown[]): JSX.Element | null;
