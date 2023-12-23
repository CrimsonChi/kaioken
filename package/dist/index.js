import { str_internal } from "./constants";
export class ReflexDOM {
    constructor() {
        Object.defineProperty(this, "nodeMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new WeakMap()
        });
        Object.defineProperty(this, "componentMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new WeakMap()
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
        Object.defineProperty(this, "_app", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "renderStack", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    get root() {
        return this.app?.node;
    }
    get app() {
        return this._app;
    }
    set app(app) {
        this._app = app;
    }
    getRenderStack() {
        return this.renderStack;
    }
    getNodeMap() {
        return this.nodeMap;
    }
    getComponentMap() {
        return this.componentMap;
    }
    static mount(root, appFunc) {
        const instance = ReflexDOM.getInstance();
        // @ts-expect-error
        const app = appFunc();
        app.state = createStateProxy(app);
        instance.app = app;
        if (app.init) {
            app.destroy = app.init({ state: app.state, props: null }) ?? undefined;
        }
        instance.renderStack.push(app);
        const node = app.render({ state: app.state, props: null });
        instance.renderStack.pop();
        instance.componentMap.set(app, node);
        if (node === null)
            return;
        instance.nodeMap.set(node, app);
        root.appendChild(node);
        return ReflexDOM.getInstance();
    }
    static getInstance() {
        if (this.instance === null) {
            this.instance = new ReflexDOM();
        }
        return this.instance;
    }
    queueUpdate(component) {
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
            const parent = this.renderStack[this.renderStack.length - 1];
            component.dirty = false;
            const node = this.componentMap.get(component);
            this.renderStack.push(component);
            const newNode = component.render({
                state: component.state,
                props: null,
            });
            this.renderStack.pop();
            if (node === null && newNode === null)
                continue;
            if (node && newNode) {
                node.replaceWith(newNode);
                this.nodeMap.set(newNode, component);
                this.componentMap.set(component, newNode);
            }
            else if (node && !newNode) {
                node.remove();
                this.nodeMap.delete(node);
                this.componentMap.delete(component);
            }
            else if (!node && newNode) {
                this.nodeMap.set(newNode, component);
                this.componentMap.set(component, newNode);
            }
        }
    }
}
Object.defineProperty(ReflexDOM, "instance", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new ReflexDOM()
});
function createStateProxy(component) {
    const state = component.state ?? {};
    return new Proxy(state, {
        set(target, key, value) {
            target[key] = value;
            ReflexDOM.getInstance().queueUpdate(component);
            return true;
        },
    });
}
export function defineComponent(defs) {
    const initial = {
        [str_internal]: true,
        node: null,
        dirty: false,
        state: defs.state ?? {},
        props: null,
        render: defs.render,
        init: defs.init,
    };
    return function (props, children) {
        const component = { ...initial, props, children };
        return component;
    };
}
export function h(tag, props = null, ...children) {
    const instance = ReflexDOM.getInstance();
    if (typeof tag === "function") {
        const component = tag(props, children);
        component.state = createStateProxy(component);
        component.props = props ?? {};
        if (component.init) {
            component.destroy =
                component.init({ state: component.state, props }) ?? undefined;
        }
        const stack = instance.getRenderStack();
        stack.push(component);
        const node = component.render({
            state: component.state,
            props,
        });
        stack.pop();
        component.node = node;
        instance.getComponentMap().set(component, node);
        if (node)
            instance.getNodeMap().set(node, component);
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
