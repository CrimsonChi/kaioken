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
        type Element = string | Node | VNode;
    }
}
export type VNode = {
    type?: string | Function;
    props: {
        [key: string]: any;
        children: VNode[];
    };
    dom?: HTMLElement | Text;
    parent?: VNode;
    child?: VNode;
    sibling?: VNode;
    alternate?: VNode;
    effectTag?: string;
    hooks: any[];
};
