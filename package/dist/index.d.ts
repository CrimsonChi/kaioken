import type { ComponentState, Component, JSXTag, IComponentDefinition, ComponentProps } from "./types";
declare class RenderStack {
    private stack;
    private _recording;
    observed: Component[];
    push(component: Component): void;
    pop(): void;
    setRecording(vaL?: boolean): void;
    get top(): Component;
}
export declare class ReflexDOM {
    private root;
    private app?;
    private updateQueued;
    private updateQueue;
    renderStack: RenderStack;
    constructor(root: Element | null);
    mount(appFunc: (props: ComponentProps, children: unknown[]) => Component): this | undefined;
    queueUpdate(component: Component): void;
    private update;
}
export declare function defineComponent<T extends ComponentState, U extends ComponentProps>(defs: IComponentDefinition<T, U>): (props: U, children: unknown[]) => Component<T, U>;
export declare function h(tag: JSXTag, props?: Record<string, unknown> | null, ...children: unknown[]): JSX.Element | null;
export {};
