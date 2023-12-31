import type { VNode } from "./types";
export declare function createElement(type: string | Function, props?: {}, ...children: VNode[]): VNode;
export declare function render(appFunc: () => VNode, container: HTMLElement): void;
export declare function useState<T>(initial: T): readonly [any, (action: T | ((oldVal: T) => T)) => void];
export declare function useEffect(callback: Function, deps?: any[]): void;
export declare function fragment(props: {
    children: VNode[];
}): {
    type: string;
    props: {
        children: VNode[];
    };
};
/** @jsx Didact.createElement */
