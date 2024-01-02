import type { VNode, Ref } from "./types";
export { mount, createElement, useEffect, useState, useRef, globalState, setWipNode, };
declare function mount(appFunc: () => VNode, container: HTMLElement): void;
declare function setWipNode(vNode: VNode): void;
declare function useState<T>(initial: T): [T, (action: T | ((oldVal: T) => T)) => void];
declare function useEffect(callback: Function, deps?: any[]): void;
declare function useRef<T>(initial: T | null): Ref<T>;
declare function createElement(type: string | Function, props?: {}, ...children: (VNode | unknown)[]): VNode;
declare function globalState(): {
    mounted: boolean;
    nextUnitOfWork: VNode | undefined;
    currentRoot: VNode | undefined;
    wipRoot: VNode | undefined;
    deletions: VNode[];
    pendingEffects: Function[];
    wipNode: VNode | null;
    hookIndex: number;
};
