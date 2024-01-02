import { useState, useEffect, createElement, setWipNode } from "../src";
import { isVNode } from "./utils";
export function Router({ basePath = "", children = [] }) {
    const [path, setPath] = useState(window.location.pathname);
    const [search, setSearch] = useState(window.location.search);
    useEffect(() => {
        const handler = () => {
            setSearch(window.location.search);
            setPath(basePath + window.location.pathname);
        };
        window.addEventListener("popstate", handler);
        return () => {
            window.removeEventListener("popstate", handler);
        };
    }, []);
    for (const child of children) {
        if (isVNode(child)) {
            const { routeMatch, params, query } = matchPath(path, search, basePath + child.props.path);
            if (routeMatch) {
                //debugger
                setWipNode(child);
                return createElement("x-router", {}, child.props.element({ params, query }));
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
