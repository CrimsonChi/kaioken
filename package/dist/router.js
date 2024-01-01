import { useState, useEffect, createElement } from "../src";
import { isVNode } from "./utils";
export function Router({ basePath = "", children = [] }) {
    const [route, setRoute] = useState(basePath + window.location.pathname);
    const [query, setQuery] = useState(window.location.search);
    useEffect(() => {
        const handler = () => {
            setQuery(window.location.search);
            setRoute(basePath + window.location.pathname);
        };
        window.addEventListener("popstate", handler);
        return () => {
            window.removeEventListener("popstate", handler);
        };
    }, []);
    for (const child of children) {
        if (isVNode(child)) {
            child.props.path = basePath + child.props.path;
            const match = matchPath(route, query, child.props.path);
            if (match.routeMatch) {
                return createElement("x-router", {}, child.props.element({ params: match.params, query: match.query }));
            }
        }
    }
    return null;
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
function matchPath(value, query, routePath) {
    let paramNames = [];
    let _query = {};
    const cPath = routePath;
    let regexPath = cPath.replace(/([:*])(\w+)/g, (_full, _colon, name) => {
        paramNames.push(name);
        return "([^/]+)";
    }) + "(?:/|$)";
    // match query params
    if (query.length) {
        _query = query
            .split("?")[1]
            .split("&")
            .reduce((str, value) => {
            if (str === null)
                _query = {};
            const [key, val] = value.split("=");
            _query[key] = val;
            return _query;
        }, null);
    }
    let params = {};
    let routeMatch = value.split("?")[0].match(new RegExp(regexPath));
    if (routeMatch !== null) {
        params = routeMatch.slice(1).reduce((acc, value, index) => {
            acc[paramNames[index]] = value.split("?")[0]; // ensure no query params
            return acc;
        }, {});
    }
    return { params, query: _query, routeMatch };
}
