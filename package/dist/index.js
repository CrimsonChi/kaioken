export class ReflexDOM {
    static mount(root, appFunc) {
        const app = appFunc();
        const node = app.render({ state: app.state });
        if (node === null)
            return;
        app.node = node;
        root.appendChild(app.node);
    }
}
function createStateProxy(state, component) {
    return new Proxy(state, {
        set(target, key, value) {
            target[key] = value;
            component.dirty = true;
            return true;
        },
    });
}
export function defineComponent(args) {
    return () => {
        return {
            state: {},
            node: null,
            dirty: false,
            ...args,
        };
    };
}
export function h(tag, props = null, ...children) {
    if (typeof tag === "function") {
        const component = tag(props, children);
        component.state = createStateProxy(component.state, component);
        if (component.init)
            component.init({ state: component.state });
        return component.render({ state: component.state });
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
