import { str_internal } from "./constants";
import { diffMerge } from "./diffMerge";
let currentInstance = null;
export class ReflexDOM {
    constructor(root) {
        Object.defineProperty(this, "root", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: root
        });
        // @ts-expect-error
        Object.defineProperty(this, "app", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "updateQueued", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "updateQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "renderStack", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        if (currentInstance) {
            throw new Error("Only one instance of ReflexDOM is allowed");
        }
        currentInstance = this;
    }
    mount(appFunc) {
        // @ts-expect-error
        const app = (this.app = appFunc());
        createStateProxy(app);
        const { state, props } = app;
        if (app.init) {
            app.destroy = app.init({ state, props }) ?? undefined;
        }
        this.renderStack.push(app);
        const node = app.render({ state, props });
        this.renderStack.pop();
        if (node === null)
            return;
        app.node = this.root?.appendChild(node);
        return this;
    }
    queueUpdate(component) {
        if (component.dirty)
            return;
        component.dirty = true;
        this.updateQueue.push(component);
        if (this.updateQueued)
            return;
        this.updateQueued = true;
        queueMicrotask(() => {
            this.updateQueued = false;
            this.update();
        });
    }
    update() {
        const queue = [...this.updateQueue];
        this.updateQueue = [];
        for (const component of queue) {
            if (!component.dirty)
                continue;
            component.dirty = false;
            this.renderStack.push(component);
            const newNode = component.render({
                state: component.state,
                props: component.props,
            });
            this.renderStack.pop();
            const node = component.node;
            if (!node && newNode === null)
                continue;
            if (node && newNode) {
                diffMerge(node, newNode);
                //node.replaceWith(newNode)
            }
            else if (node && !newNode) {
                node.remove();
            }
            else if (!node && newNode) {
            }
        }
    }
}
function createStateProxy(component) {
    component.state = new Proxy(component.state ?? {}, {
        set(target, key, value) {
            target[key] = value;
            currentInstance?.queueUpdate(component);
            return true;
        },
        get(target, p, receiver) {
            return Reflect.get(target, p, receiver);
        },
    });
}
export function defineComponent(defs) {
    const initial = {
        [str_internal]: true,
        dirty: false,
        state: defs.state ?? {},
        props: {},
        render: defs.render,
        init: defs.init,
    };
    return function (props, children) {
        const component = { ...initial, props, children };
        return component;
    };
}
export function h(tag, props = null, ...children) {
    if (typeof tag === "function") {
        const component = tag(props, children);
        createStateProxy(component);
        component.props = props ?? {};
        if (component.init) {
            component.destroy =
                component.init({ state: component.state, props }) ?? undefined;
        }
        currentInstance?.renderStack.push(component);
        const node = component.render({
            state: component.state,
            props,
        });
        currentInstance?.renderStack.pop();
        component.node = node;
        return node;
    }
    const el = document.createElement(tag);
    if (props === null) {
        props = {};
    }
    for (const [key, value] of Object.entries(props)) {
        if (key === "style") {
            Object.assign(el.style, value);
        }
        else if (key.startsWith("on")) {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, value);
        }
        else {
            el.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (child === null || child === undefined) {
            continue;
        }
        else if (Array.isArray(child)) {
            el.append(...child);
        }
        else if (child instanceof Node) {
            el.appendChild(child);
        }
        else {
            el.appendChild(document.createTextNode(child.toString()));
        }
    }
    return el;
}
