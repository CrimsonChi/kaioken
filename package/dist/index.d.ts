import type { VNode } from "./types";
export { mount, createElement, fragment, useEffect, useState };
declare function mount(appFunc: () => VNode, container: HTMLElement): void;
declare function createElement(type: string | Function, props?: {}, ...children: (VNode | unknown)[]): VNode;
declare function fragment(props: {
    children: VNode[];
}): {
    type: string;
    props: {
        children: VNode[];
    };
};
declare function useState<T>(initial: T): [T, (action: T | ((oldVal: T) => T)) => void];
declare function useEffect(callback: Function, deps?: any[]): void;
