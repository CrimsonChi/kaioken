import type { Fiber } from "./types";
export declare function createElement(type: string | Function, props?: {}, ...children: Fiber[]): Fiber;
export declare function render(appFunc: () => Fiber, container: HTMLElement): void;
export declare function useState<T>(initial: T): readonly [any, (action: T | ((oldVal: T) => T)) => void];
export declare function useEffect(callback: Function, deps?: any[]): void;
export declare function fragment(props: {
    children: Fiber[];
}): {
    type: string;
    props: {
        children: Fiber[];
    };
};
/** @jsx Didact.createElement */
