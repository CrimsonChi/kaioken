import type { VNode } from "./types";
export { render, createElement, fragment, useEffect, useState };
declare function createElement(type: string | Function, props?: {}, ...children: VNode[]): VNode;
declare function render(appFunc: () => VNode, container: HTMLElement): void;
declare function useState<T>(initial: T): readonly [any, (action: T | ((oldVal: T) => T)) => void];
declare function useEffect(callback: Function, deps?: any[]): void;
declare function fragment(props: {
    children: VNode[];
}): {
    type: string;
    props: {
        children: VNode[];
    };
};
