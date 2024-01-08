import type { Rec, RouteChildProps } from "./types"
import { createElement } from "./index.js"
import { isVNode } from "./utils.js"
import { useEffect, useState } from "./hooks.js"

interface RouterProps {
  basePath?: string
  children?: JSX.Element[]
}

type RouterState = {
  path: string
  search: string
}

export function Router(props: RouterProps) {
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

    return () => {
      window.removeEventListener("popstate", handler)
    }
  }, [])

  for (const child of props.children ?? []) {
    if (isVNode(child)) {
      const { routeMatch, params, query } = matchPath(
        state.path,
        state.search,
        (props.basePath || "") + child.props.path
      )
      if (routeMatch) {
        // return child.props.element({ params, query })
        return createElement(
          "x-router",
          {},
          createElement(child.props.element, { params, query })
        )
      }
    }
  }

  return null
}

type RouteComponentFunc = (props: RouteChildProps) => JSX.Element

interface RouteComponentProps {
  path: string
  element: RouteComponentFunc
}

export function Route({ path, element }: RouteComponentProps) {
  return createElement("x-route", { path, element })
}

export function Link({ to, children }: { to: string; children?: JSX.Element }) {
  return createElement(
    "a",
    {
      href: to,
      onClick: (e: Event) => {
        e.preventDefault()
        window.history.pushState({}, "", to)
        var popStateEvent = new PopStateEvent("popstate", { state: {} })
        dispatchEvent(popStateEvent)
      },
    },
    children
  )
}

function matchPath(
  value: string,
  query: string,
  routePath: string
): {
  params: any
  query: any
  routeMatch: RegExpMatchArray | null
} {
  let paramNames: any[] = []
  let _query: any = {}

  const cPath: string = routePath
  let regexPath =
    cPath.replace(/([:*])(\w+)/g, (_full, _colon, name) => {
      paramNames.push(name)
      return "([^/]+)"
    }) + "(?:/|$)"

  // match query params
  if (query.length) {
    _query = query
      .split("?")[1]
      .split("&")
      .reduce((str, value) => {
        if (str === null) _query = {}
        const [key, val] = value.split("=")
        _query[key] = val
        return _query
      }, null)
  }

  let params: any = {}
  let routeMatch = value.split("?")[0].match(new RegExp(regexPath))
  if (routeMatch !== null) {
    params = routeMatch.slice(1).reduce((acc, value, index) => {
      acc[paramNames[index]] = value.split("?")[0] // ensure no query params
      return acc
    }, {} as Rec)
  }
  return { params, query: _query, routeMatch }
}
