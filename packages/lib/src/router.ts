import type { ElementProps } from "./types"
import { createElement, fragment } from "./index.js"
import { isVNode } from "./utils.js"
import { useState, useEffect } from "./hooks/index.js"
import { node } from "./globalContext.js"

export { Router, Route, Link, navigate, matchPath }
export type { RouteChildProps, LinkProps }

interface LinkProps extends ElementProps<"a"> {
  to: string
}

interface RouterProps {
  basePath?: string
  children?: JSX.Element[]
}

type RouterState = {
  path: string
  search: string
}

interface RouteProps {
  path: string
  /**
   * Allow url with additional segments being matched. Useful with nested routers.
   * @example
   * ```tsx
   * // the following route would match the url '/test/something-else'
   * <Route path="/test" fallthrough />
   * ```
   */
  fallthrough?: boolean
  element: (props: RouteChildProps) => JSX.Element | null
}

interface RouteChildProps {
  params: Record<string, any>
  query: Record<string, any>
}

type RouteComponent = Kaioken.VNode & { props: RouteProps }
type RouterComponent = Kaioken.VNode & { props: RouterProps }

const routeDataSymbol = Symbol.for("kaioken.routeData")

function Router(props: RouterProps) {
  const [state, setState] = useState({
    path: window.location.pathname,
    search: window.location.search,
  } as RouterState)

  const parentPath = buildParentPath(node.current!)

  useEffect(() => {
    const handler = () => {
      setState({
        path: window.location.pathname,
        search: window.location.search,
      })
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [])

  const pathSegments = state.path.split("/")
  const query = extractQueryParams(state.search)

  let fallbackRoute: RouteComponent | undefined
  for (const child of props.children ?? []) {
    if (!isRoute(child)) continue

    if (child.props.path === "*") {
      fallbackRoute = child
      continue
    }

    const routeSegments =
      `${parentPath}${props.basePath || ""}${child.props.path}`.split("/")

    const params = matchPath(
      routeSegments,
      pathSegments,
      child.props.fallthrough
    )
    if (params) {
      return fragment({
        children: [
          createElement(child.props.element, {
            params,
            query,
          }),
        ],
        [routeDataSymbol]: { path: child.props.path },
      })
    }
  }

  if (fallbackRoute) {
    return createElement(fallbackRoute.props.element, { params: {}, query })
  }

  return null
}

function Route({ path, element, fallthrough }: RouteProps) {
  return fragment({
    children: [],
    [routeDataSymbol]: { path, element, fallthrough },
  })
}

function navigate(to: string) {
  window.history.pushState({}, "", to)
  window.dispatchEvent(new PopStateEvent("popstate", { state: {} }))
}

function Link({ to, children, ...props }: LinkProps) {
  return createElement(
    "a",
    {
      href: to,
      onclick: (e: Event) => {
        e.preventDefault()
        navigate(to)
      },
      ...props,
    },
    children
  )
}

type ActiveRouteData = {
  path: string
}

function buildParentPath(node: Kaioken.VNode) {
  let parentPath = ""
  let parent: Kaioken.VNode | undefined = node.parent

  while (parent) {
    if (routeDataSymbol in parent.props) {
      parentPath =
        (parent.props[routeDataSymbol] as ActiveRouteData).path + parentPath
    } else if (isRouter(parent) && parent.props.basePath) {
      parentPath = parent.props.basePath + parentPath
    }
    parent = parent.parent
  }
  return parentPath
}

function isRoute(thing: unknown): thing is RouteComponent {
  return isVNode(thing) && thing.type === Route
}

function isRouter(thing: unknown): thing is RouterComponent {
  return isVNode(thing) && thing.type === Router
}

function extractQueryParams(query: string) {
  let _query: Record<string, string> = {}
  const rSide = query.split("?")[1]
  if (!rSide) return _query

  return rSide.split("&").reduce((acc, value) => {
    const [key, val] = value.split("=")
    acc[key] = val
    return acc
  }, _query)
}

function matchPath(
  routeSegments: string[],
  pathSegments: string[],
  fallthrough?: boolean
) {
  const params: Record<string, string> = {}

  if (!fallthrough && routeSegments.length !== pathSegments.length) {
    return null
  }

  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i]
    const pathSegment = pathSegments[i]

    if (routeSegment.startsWith(":")) {
      params[routeSegment.substring(1)] = pathSegment
    } else if (routeSegment !== pathSegment) {
      return null
    }
  }

  return params
}
