import type { VNode, Ref, Context } from "./types";
export { mount, createElement, fragment, useEffect, useState, useRef, useReducer, useContext, createContext, createPortal, globalState, setWipNode, };
declare function mount(appFunc: () => VNode, container: HTMLElement): void;
declare function setWipNode(vNode: VNode): void;
declare function useState<T>(initial: T): [T, (action: T | ((oldVal: T) => T)) => void];
declare function useEffect(callback: Function, deps?: any[]): void;
declare function useRef<T>(initial: T | null): Ref<T>;
declare function useReducer<T, A>(reducer: (state: T, action: A) => T, initial: T): [T, (action: A) => void];
declare function useContext<T>(context: Context<T>): T;
declare function createContext<T>(initial: T | null): Context<T>;
declare function createPortal(element: JSX.Element, container: HTMLElement | Text): JSX.Element | undefined;
declare function fragment({ children, }: {
    children: (VNode | unknown)[];
}): JSX.Element;
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
