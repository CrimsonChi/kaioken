import type { Fiber } from "./types";
export declare function createElement(type: string | Function, props?: {}, ...children: Fiber[]): Fiber;
export declare function render(node: Fiber, container: HTMLElement): void;
export declare function useState<T>(initial: T): readonly [any, (action: T | ((oldVal: T) => T)) => void];
export declare function fragment(props: {
    children: Fiber[];
}): Fiber[];
/** @jsx Didact.createElement */
