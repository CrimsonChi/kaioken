export { render, createElement, fragment, useEffect, useState };
let nextUnitOfWork = undefined;
let currentRoot = undefined;
let wipRoot = undefined;
let deletions = [];
let pendingEffects = [];
let wipNode = null;
let hookIndex = -1;
function createElement(type, props = {}, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children
                .flat()
                .map((child) => typeof child === "object" ? child : createTextElement(child)),
        },
        hooks: [],
    };
}
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
        hooks: [],
    };
}
function createDom(vNode) {
    const dom = vNode.type == "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(vNode.type);
    updateDom(dom, {}, vNode.props);
    return dom;
}
const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (_prev, next) => (key) => !(key in next);
function updateDom(dom, prevProps, nextProps = {}) {
    //Remove old or changed event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
        .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.removeEventListener(eventType, prevProps[name]);
    });
    // Remove old properties
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach((name) => {
        // @ts-ignore
        dom[name] = "";
    });
    // Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach((name) => {
        // @ts-ignore
        dom[name] = nextProps[name];
    });
    // Add event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.addEventListener(eventType, nextProps[name]);
    });
}
function commitRoot() {
    deletions.forEach(commitWork);
    commitWork(wipRoot?.child);
    currentRoot = wipRoot;
    while (pendingEffects.length)
        pendingEffects.pop()?.();
    wipRoot = undefined;
}
function commitWork(vNode) {
    if (!vNode) {
        return;
    }
    let domParentNode = vNode.parent;
    while (!domParentNode?.dom) {
        domParentNode = domParentNode?.parent;
    }
    const domParent = domParentNode.dom;
    if (vNode.effectTag === "PLACEMENT" && vNode.dom != null) {
        domParent.appendChild(vNode.dom);
    }
    else if (vNode.effectTag === "UPDATE" && vNode.dom != null) {
        updateDom(vNode.dom, vNode.alternate?.props ?? {}, vNode.props);
    }
    else if (vNode.effectTag === "DELETION") {
        commitDeletion(vNode, domParent);
        return;
    }
    commitWork(vNode.child);
    commitWork(vNode.sibling);
}
function commitDeletion(vNode, domParent) {
    if (vNode.dom) {
        domParent.removeChild(vNode.dom);
    }
    else if (vNode.child) {
        commitDeletion(vNode.child, domParent);
    }
}
function render(appFunc, container) {
    const app = appFunc();
    app.type = appFunc;
    wipRoot = {
        dom: container,
        props: {
            children: [app],
        },
        alternate: currentRoot,
        hooks: [],
    };
    deletions = [];
    nextUnitOfWork = wipRoot;
}
function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadline.timeRemaining() < 1;
    }
    if (!nextUnitOfWork && wipRoot) {
        commitRoot();
    }
    requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);
function performUnitOfWork(vNode) {
    const isFunctionComponent = vNode.type instanceof Function;
    if (isFunctionComponent) {
        updateFunctionComponent(vNode);
    }
    else {
        updateHostComponent(vNode);
    }
    if (vNode.child) {
        return vNode.child;
    }
    let nextNode = vNode;
    while (nextNode) {
        if (nextNode.sibling) {
            return nextNode.sibling;
        }
        nextNode = nextNode.parent;
    }
    return;
}
function updateFunctionComponent(vNode) {
    wipNode = vNode;
    hookIndex = 0;
    wipNode.hooks = [];
    const children = [vNode.type(vNode.props)];
    reconcileChildren(vNode, children);
}
function useState(initial) {
    const oldHook = wipNode?.alternate &&
        wipNode.alternate.hooks &&
        wipNode.alternate.hooks[hookIndex];
    const hook = {
        state: oldHook ? oldHook.state : initial,
        //queue: [] as Function[],
    };
    // const actions = oldHook ? oldHook.queue : []
    // actions.forEach((action: Function) => {
    //   hook.state = action(hook.state)
    // })
    const setState = (action) => {
        if (!currentRoot)
            throw new Error("currentRoot is undefined, why???");
        //hook.queue.push(typeof action === "function" ? action : () => action)
        hook.state =
            typeof action === "function" ? action(hook.state) : action;
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
            hooks: [],
        };
        nextUnitOfWork = wipRoot;
        deletions = [];
    };
    wipNode?.hooks.push(hook);
    hookIndex++;
    return [hook.state, setState];
}
function useEffect(callback, deps = []) {
    const oldHook = wipNode?.alternate &&
        wipNode.alternate.hooks &&
        wipNode.alternate.hooks[hookIndex];
    const hasChangedDeps = deps.length === 0 ||
        (!!oldHook && !deps.every((dep, i) => dep === oldHook.deps[i]));
    if (hasChangedDeps) {
        pendingEffects.push(callback);
    }
    wipNode?.hooks.push({
        deps,
        callback,
    });
    hookIndex++;
}
function updateHostComponent(vNode) {
    if (!vNode.dom) {
        vNode.dom = createDom(vNode);
    }
    reconcileChildren(vNode, vNode.props.children);
}
function reconcileChildren(wipNode, children) {
    let index = 0;
    let oldNode = wipNode.alternate && wipNode.alternate.child;
    let prevSibling = undefined;
    while (index < children.length || oldNode != null) {
        const child = children[index];
        let newNode = undefined;
        const sameType = oldNode && child && child.type == oldNode.type;
        if (sameType) {
            newNode = {
                type: oldNode.type,
                props: child.props,
                dom: oldNode.dom,
                parent: wipNode,
                alternate: oldNode,
                effectTag: "UPDATE",
                hooks: oldNode.hooks,
            };
        }
        if (child && !sameType) {
            newNode = {
                type: child.type,
                props: child.props,
                dom: undefined,
                parent: wipNode,
                alternate: undefined,
                effectTag: "PLACEMENT",
                hooks: [],
            };
        }
        if (oldNode && !sameType) {
            oldNode.effectTag = "DELETION";
            deletions.push(oldNode);
        }
        if (oldNode) {
            oldNode = oldNode.sibling;
        }
        if (index === 0) {
            wipNode.child = newNode;
        }
        else if (child) {
            prevSibling.sibling = newNode;
        }
        prevSibling = newNode;
        index++;
    }
}
function fragment(props) {
    return {
        type: "fragment",
        props,
    };
}
