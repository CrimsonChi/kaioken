import { str_internal } from "./constants";
export class ReflexDOM {
    constructor() {
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
        Object.defineProperty(this, "_stateDepsMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new WeakMap()
        });
        Object.defineProperty(this, "_root", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // @ts-expect-error
        Object.defineProperty(this, "app", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_renderStack", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    get root() {
        return this._root;
    }
    get renderStack() {
        return this._renderStack;
    }
    get stateDepsMap() {
        return this._stateDepsMap;
    }
    static mount(root, appFunc) {
        const instance = ReflexDOM.getInstance();
        instance._root = root;
        // @ts-expect-error
        const app = (instance.app = appFunc());
        createStateProxy(app);
        const { state, props } = app;
        if (app.init) {
            app.destroy = app.init({ state, props }) ?? undefined;
        }
        instance.renderStack.push(app);
        const node = app.render({ state, props });
        instance.renderStack.pop();
        if (node === null)
            return;
        app.node = root.appendChild(node);
        return ReflexDOM.getInstance();
    }
    static getInstance() {
        if (this.instance === null) {
            this.instance = new ReflexDOM();
        }
        return this.instance;
    }
    static queueUpdate(component) {
        if (component.dirty)
            return;
        component.dirty = true;
        const instance = ReflexDOM.getInstance();
        instance.updateQueue.push(component);
        if (instance.updateQueued)
            return;
        instance.updateQueued = true;
        queueMicrotask(() => {
            instance.updateQueued = false;
            instance.update();
        });
    }
    update() {
        const queue = [...this.updateQueue];
        this.updateQueue = [];
        for (const component of queue) {
            if (!component.dirty)
                continue;
            component.dirty = false;
            const deps = this.stateDepsMap.get(component.state);
            console.log("deps", deps);
            if (deps) {
                debugger;
                for (const dep of deps) {
                    if (dep != component && dep.destroy) {
                        debugger;
                        dep.destroy({ state: dep.state, props: dep.props });
                    }
                }
            }
            this.renderStack.push(component);
            const newNode = component.render({
                state: component.state,
                props: component.props,
            });
            this.renderStack.pop();
            const node = component.node;
            component.node = newNode;
            if (!node && newNode === null)
                continue;
            if (node && newNode) {
                //diffMerge(node, newNode)
                node.replaceWith(newNode);
            }
            else if (node && !newNode) {
                node.remove();
            }
            else if (!node && newNode) {
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
    const instance = ReflexDOM.getInstance();
    component.state = new Proxy(state, {
        set(target, key, value) {
            target[key] = value;
            ReflexDOM.queueUpdate(component);
            return true;
        },
        get(target, p, receiver) {
            const stack = instance.renderStack;
            if (stack.length === 0)
                return Reflect.get(target, p, receiver);
            const current = stack[stack.length - 1];
            const deps = instance.stateDepsMap.get(receiver);
            if (deps)
                deps.add(current);
            else
                instance.stateDepsMap.set(receiver, new Set([current]));
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
    const instance = ReflexDOM.getInstance();
    if (typeof tag === "function") {
        const component = tag(props, children);
        createStateProxy(component);
        component.props = props ?? {};
        if (component.init) {
            component.destroy =
                component.init({ state: component.state, props }) ?? undefined;
        }
        instance.renderStack.push(component);
        const node = component.render({
            state: component.state,
            props,
        });
        instance.renderStack.pop();
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
