import type { ComponentState, Component, JSXTag, IComponentDefinition, ComponentProps, NodeToComponentMap, ComponentToNodeMap } from "./types";
export declare class ReflexDOM {
    private static instance;
    private nodeMap;
    private componentMap;
    private updateQueued;
    private updateQueue;
    private _app?;
    private renderStack;
    get root(): Element | null;
    get app(): Component | undefined;
    set app(app: Component | undefined);
    getRenderStack(): Component[];
    getNodeMap(): NodeToComponentMap;
    getComponentMap(): ComponentToNodeMap;
    static mount(root: Element, appFunc: (props: ComponentProps) => Component): ReflexDOM | undefined;
    static getInstance(): ReflexDOM;
    queueUpdate(component: Component): void;
    private update;
}
export declare function defineComponent<T extends ComponentState, U extends ComponentProps>(defs: IComponentDefinition<T, U>): (props: U, children: unknown[]) => Component<T, U>;
export declare function h(tag: JSXTag, props?: Record<string, unknown> | null, ...children: unknown[]): JSX.Element | null;
