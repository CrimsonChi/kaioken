import type { ComponentState, Component, JSXTag, IComponentDefinition } from "./types";
export declare class ReflexDOM {
    static mount(root: Element, appFunc: () => Component): void;
}
export declare function defineComponent<T extends ComponentState>(args: IComponentDefinition<T>): () => Component<T>;
export declare function h(tag: JSXTag, props?: Record<string, unknown> | null, ...children: unknown[]): JSX.Element | null;
