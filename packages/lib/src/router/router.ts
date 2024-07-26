import { createElement } from "../element.js"
import { useState, useEffect, useMemo, useContext } from "../hooks/index.js"
import { __DEV__ } from "../env.js"
import { isRoute } from "./route.js"
import { createContext } from "../context.js"

type RouterCtx = {
  parsedParams: Record<string, string>
  parsedQuery: Record<string, string>
  routePath: string
  basePath?: string
  isDefault: boolean
}
const RouterContext = createContext<RouterCtx>({
  parsedParams: {},
  parsedQuery: {},
  routePath: "/",
  basePath: undefined,
  isDefault: true,
})
export const useRouter = () => {
  const { parsedParams: params, parsedQuery: query } = useContext(RouterContext)
  return { params, query }
}

interface RouterProps {
  basePath?: string
  children?: JSX.Children
}

export function Router(props: RouterProps) {
  const parentRouterContext = useContext(RouterContext, false)
  const dynamicParentPath = parentRouterContext.isDefault
    ? undefined
    : parentRouterContext.routePath
  const dynamicParentPathSegments = useMemo(
    () => dynamicParentPath?.split("/").filter(Boolean),
    [dynamicParentPath]
  )

  const [loc, setLoc] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
  })
  const parsedQuery = useMemo(() => parseSearchParams(loc.search), [loc.search])
  const realPathSegments = useMemo(
    () => loc.pathname.split("/").filter(Boolean),
    [loc.pathname]
  )

  useEffect(() => {
    const handler = () => {
      setLoc({
        pathname: window.location.pathname,
        search: window.location.search,
      })
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [])

  type RouteComponent = Kaioken.VNode & {
    props: { path: string; fallthrough?: boolean; element: JSX.Element }
  }
  let fallbackRoute: RouteComponent | undefined
  let route: RouteComponent | undefined

  for (const child of (props.children as Array<JSX.Element>) ?? []) {
    if (!isRoute(child)) continue

    if (child.props.path === "*") {
      if (__DEV__) {
        if (fallbackRoute) {
          console.warn(
            "[kaioken]: More than one fallback route defined. Only the last one will be used."
          )
        }
      }
      fallbackRoute = child
      continue
    }
    const dynamicChildPathSegments = ((props.basePath || "") + child.props.path)
      .split("/")
      .filter(Boolean)
    if (
      routeMatchesPath(
        (dynamicParentPathSegments || []).concat(dynamicChildPathSegments),
        realPathSegments,
        child.props.fallthrough
      )
    ) {
      route = child
      break
    }
  }

  let parsedParams = {}
  if (route) {
    const dynamicChildPathSegments = ((props.basePath || "") + route.props.path)
      .split("/")
      .filter(Boolean)
    parsedParams = parsePathParams(
      (dynamicParentPathSegments || []).concat(dynamicChildPathSegments),
      realPathSegments
    )
  }
  const params = { ...parentRouterContext.parsedParams, ...parsedParams }

  return createElement(
    RouterContext.Provider,
    {
      value: {
        parsedParams: params,
        parsedQuery: parsedQuery,
        basePath: props.basePath,
        routePath:
          (dynamicParentPath || "") +
          (props.basePath || "") +
          (route?.props.path || ""),
        isDefault: false,
      },
    },
    [route ?? fallbackRoute ?? null]
  )
}

function routeMatchesPath(
  dynamicPathSegments: string[],
  realPathSegments: string[],
  fallthrough?: boolean
) {
  if (!fallthrough && dynamicPathSegments.length < realPathSegments.length) {
    return false
  }

  for (let i = 0; i < dynamicPathSegments.length; i++) {
    const segment = dynamicPathSegments[i]
    if (segment.startsWith(":")) {
      continue
    } else if (segment !== realPathSegments[i]) {
      return false
    }
  }

  return true
}

function parsePathParams(
  dynamicPathSegments: string[],
  realPathSegments: string[]
) {
  const params: Record<string, string> = {}
  for (let i = 0; i < dynamicPathSegments.length; i++) {
    const segment = dynamicPathSegments[i]
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = realPathSegments[i]
    }
  }
  return params
}

function parseSearchParams(search: string) {
  const parsed: Record<string, string> = {}
  const str = search.split("?")[1]
  if (!str || str === "") return parsed

  const parts = str.split("&")
  for (let i = 0; i < parts.length; i++) {
    const [key, val] = parts[i].split("=")
    parsed[key] = val
  }
  return parsed
}
