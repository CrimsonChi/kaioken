import type { VNode } from "./types";
export { mount, createElement, useEffect, useState, globalState };
declare function mount(appFunc: () => VNode, container: HTMLElement): void;
declare function useState<T>(initial: T): [T, (action: T | ((oldVal: T) => T)) => void];
declare function useEffect(callback: Function, deps?: any[]): void;
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
