declare global {
    namespace JSX {
        interface IntrinsicElements {
            [key: string]: any;
        }
        interface ElementAttributesProperty {
            props: {};
        }
        interface ElementChildrenAttribute {
            children: {};
        }
        interface IntrinsicAttributes {
            [key: string]: any;
        }
        interface IntrinsicClassAttributes<T> {
            [key: string]: any;
        }
        type Element = string | Node | Fiber;
    }
}
export type Fiber = {
    type?: string | Function;
    props: {
        [key: string]: any;
        children: Fiber[];
    };
    dom?: HTMLElement | Text;
    parent?: Fiber;
    child?: Fiber;
    sibling?: Fiber;
    alternate?: Fiber;
    effectTag?: string;
    hooks: any[];
};
