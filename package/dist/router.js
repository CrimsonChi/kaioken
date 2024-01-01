import { useState, useEffect, createElement } from "../src";
import { isVNode } from "./utils";
export function Router({ basePath = "", children = [] }) {
    const [route, setRoute] = useState(basePath + window.location.pathname);
    useEffect(() => {
        const handler = () => {
            setRoute(basePath + window.location.pathname);
        };
        window.addEventListener("popstate", handler);
        return () => {
            window.removeEventListener("popstate", handler);
        };
    }, []);
    const child = children.find((child) => isVNode(child) && child.props.path === route);
    if (!child?.type)
        return null;
    return child.props.element({ params: { test: "test" } });
}
export function Route({ path, element }) {
    return {
        type: "Route",
        props: {
            path,
            element,
            children: [],
        },
        hooks: [],
    };
}
export function Link({ to, children }) {
    return createElement("a", {
        href: to,
        onClick: (e) => {
            e.preventDefault();
            window.history.pushState({}, "", to);
            var popStateEvent = new PopStateEvent("popstate", { state: {} });
            dispatchEvent(popStateEvent);
        },
    }, children);
}
