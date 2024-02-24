import type { ElementProps } from "./types"
import { createElement, fragment } from "./index.js"
import { isVNode } from "./utils.js"
import { useState, useEffect } from "./hooks/index.js"

export { Router, Route, Link, navigate, matchPath }
export type { RouteChildProps, LinkProps }

interface RouterProps {
  basePath?: string
  children?: JSX.Element[]
}

type RouterState = {
  path: string
  search: string
}

function Router(props: RouterProps) {
  const [state, setState] = useState({
    path: window.location.pathname,
    search: window.location.search,
  } as RouterState)

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
    if (isRoute(child)) {
      if (isFallbackRoute(child)) {
        fallbackRoute = child
        continue
      }
      const routeSegments = ((props.basePath || "") + child.props.path).split(
        "/"
      )
      const params = matchPath(routeSegments, pathSegments)
      if (params) {
        return fragment({
          children: [createElement(child.props.element, { params, query })],
        })
      }
    }
  }
  if (fallbackRoute) {
    return fragment({
      children: [
        createElement(fallbackRoute.props.element, { params: {}, query }),
      ],
    })
  }

  return null
}

interface RouteProps {
  path: string
  element: (props: RouteChildProps) => JSX.Element | null
}

interface RouteChildProps {
  params: Record<string, any>
  query: Record<string, any>
}

type RouteComponent = Kaioken.VNode & { props: RouteProps }

function isFallbackRoute(route: RouteComponent) {
  return route.props.path === "*"
}

function isRoute(thing: unknown): thing is RouteComponent {
  return isVNode(thing) && thing.type === Route
}

function Route({ path, element }: RouteProps) {
  return createElement(Route, { path, element })
}

function navigate(to: string) {
  window.history.pushState({}, "", to)
  window.dispatchEvent(new PopStateEvent("popstate", { state: {} }))
}

interface LinkProps extends ElementProps<"a"> {
  to: string
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

function matchPath(routeSegments: string[], pathSegments: string[]) {
  const params: Record<string, string> = {}

  if (routeSegments.length !== pathSegments.length) {
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
