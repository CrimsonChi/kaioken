export function createElement(type, props = {}, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map((child) => typeof child === "object" ? child : createTextElement(child)),
        },
    };
}
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    };
}
function createDom(fiber) {
    const dom = fiber.type == "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fiber.type);
    updateDom(dom, {}, fiber.props);
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
    wipRoot = undefined;
}
function commitWork(fiber) {
    if (!fiber) {
        return;
    }
    let domParentFiber = fiber.parent;
    while (!domParentFiber?.dom) {
        domParentFiber = domParentFiber?.parent;
    }
    const domParent = domParentFiber.dom;
    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom);
    }
    else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props);
    }
    else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent);
        return;
    }
    commitWork(fiber.child);
    commitWork(fiber.sibling);
}
function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom);
    }
    else if (fiber.child) {
        commitDeletion(fiber.child, domParent);
    }
}
export function render(appFunc, container) {
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
let nextUnitOfWork = undefined;
let currentRoot = undefined;
let wipRoot = undefined;
let deletions = [];
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
function performUnitOfWork(fiber) {
    const isFunctionComponent = fiber.type instanceof Function;
    if (isFunctionComponent) {
        updateFunctionComponent(fiber);
    }
    else {
        updateHostComponent(fiber);
    }
    if (fiber.child) {
        return fiber.child;
    }
    let nextFiber = fiber;
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }
        nextFiber = nextFiber.parent;
    }
    return;
}
let wipFiber = null;
let hookIndex = -1;
function updateFunctionComponent(fiber) {
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
}
export function useState(initial) {
    const oldHook = wipFiber?.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex];
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    };
    const actions = oldHook ? oldHook.queue : [];
    actions.forEach((action) => {
        hook.state = action(hook.state);
    });
    const setState = (action) => {
        if (!currentRoot)
            throw new Error("currentRoot is undefined, why???");
        hook.queue.push(typeof action === "function" ? action : () => action);
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        };
        nextUnitOfWork = wipRoot;
        deletions = [];
    };
    wipFiber?.hooks.push(hook);
    hookIndex++;
    return [hook.state, setState];
}
function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber);
    }
    reconcileChildren(fiber, fiber.props.children);
}
function reconcileChildren(wipFiber, children) {
    let index = 0;
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    let prevSibling = undefined;
    while (index < children.length || oldFiber != null) {
        const child = children[index];
        let newFiber = undefined;
        const sameType = oldFiber && child && child.type == oldFiber.type;
        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: child.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            };
        }
        if (child && !sameType) {
            newFiber = {
                type: child.type,
                props: child.props,
                dom: undefined,
                parent: wipFiber,
                alternate: undefined,
                effectTag: "PLACEMENT",
            };
        }
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION";
            deletions.push(oldFiber);
        }
        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }
        if (index === 0) {
            wipFiber.child = newFiber;
        }
        else if (child) {
            prevSibling.sibling = newFiber;
        }
        prevSibling = newFiber;
        index++;
    }
}
export function fragment(props) {
    return {
        type: "fragment",
        props,
    };
}
/** @jsx Didact.createElement */
// function Counter() {
//   const [state, setState] = Didact.useState(1)
//   return <h1 onClick={() => setState((c) => c + 1)}>Count: {state}</h1>
// }
// const element = <Counter />
// const container = document.getElementById("root")
// Didact.render(element, container)
