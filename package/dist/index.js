import { str_internal } from "./constants";
export class ReflexDOM {
    constructor() {
        Object.defineProperty(this, "components", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "updateQueued", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_app", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
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
    static mount(root, appFunc) {
        const app = appFunc();
        app.state = this.getInstance().createStateProxy(app.state);
        ReflexDOM.getInstance().app = app;
        if (app.init)
            app.init({ state: app.state });
        const node = app.render({ state: app.state });
        if (node === null)
            return;
        app.node = node;
        root.appendChild(app.node);
        return ReflexDOM.getInstance();
    }
    static getInstance() {
        if (this.instance === null) {
            this.instance = new ReflexDOM();
        }
        return this.instance;
    }
    queueUpdate() {
        if (this.updateQueued)
            return;
        this.updateQueued = true;
        queueMicrotask(() => {
            this.updateQueued = false;
            this.update();
        });
    }
    update() {
        this.components.forEach((component) => {
            if (!component.dirty)
                return;
            component.dirty = false;
            const node = component.render({ state: component.state });
            if (node === null) {
                ;
                component.node?.remove();
                component.node = null;
                return;
            }
            if (component.node === null) {
                component.node = node;
            }
            else {
                ;
                component.node.replaceWith(node);
                component.node = node;
            }
        });
    }
    createStateProxy(component) {
        const instance = this;
        const state = component.state ?? {};
        return new Proxy(state, {
            set(target, key, value) {
                target[key] = value;
                component.dirty = true;
                instance.queueUpdate();
                return true;
            },
        });
    }
    registerComponent(component) {
        component.state = this.createStateProxy(component);
        this.components.push(component);
    }
}
Object.defineProperty(ReflexDOM, "instance", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new ReflexDOM()
});
export function defineComponent(args) {
    return () => {
        return {
            [str_internal]: true,
            state: {},
            node: null,
            dirty: false,
            parent: undefined,
            ...args,
        };
    };
}
function isComponent(node) {
    return !!node && str_internal in node;
}
export function h(tag, props = null, ...children) {
    if (typeof tag === "function") {
        const component = tag(props, children);
        for (const child of children) {
            if (isComponent(child)) {
                child.parent = component;
            }
        }
        ReflexDOM.getInstance().registerComponent(component);
        if (component.init)
            component.init({ state: component.state });
        const node = component.render({ state: component.state });
        if (node === null)
            return null;
        component.node = node;
        return component.node;
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
