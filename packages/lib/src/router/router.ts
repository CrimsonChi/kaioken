import { createElement } from "../element.js"
import {
  useState,
  useMemo,
  useContext,
  useLayoutEffect,
  useRef,
  useAppContext,
} from "../hooks/index.js"
import { __DEV__ } from "../env.js"
import {
  parsePathParams,
  parseSearchParams,
  routeMatchesPath,
} from "./routerUtils.js"
import { createContext } from "../context.js"
import { isRoute, Route } from "./route.js"
import { type AppContext } from "../appContext.js"
import { noop } from "../utils.js"

type RouterCtx = {
  queueSyncNav: (callback: () => void) => void
  params: Record<string, string>
  query: Record<string, string>
  routePath: string
  basePath?: string
  isDefault: boolean
}
const RouterContext = createContext<RouterCtx>({
  queueSyncNav: noop,
  params: {},
  query: {},
  routePath: "/",
  basePath: undefined,
  isDefault: true,
})
RouterContext.displayName = "RouterContextProvider"

function setQuery(query: Record<string, string>) {
  const url = new URL(window.location.href)
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  window.history.pushState({}, "", url.toString())
  window.dispatchEvent(new PopStateEvent("popstate", { state: {} }))
}

export function useRouter() {
  const { params, query } = useContext(RouterContext)
  return { params, query, setQuery }
}

export function navigate(to: string, options?: { replace?: boolean }) {
  let ctx: AppContext | undefined
  try {
    ctx = useAppContext()
  } catch (e) {}

  const doNav = () => {
    window.history[options?.replace ? "replaceState" : "pushState"]({}, "", to)
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }))
  }
  // not called during render, just do the navigation
  if (!ctx) return doNav(), null

  const routerCtx = useContext(RouterContext, false)
  if (routerCtx.isDefault) {
    /**
     * called from a non-router-decendant - postpone
     * until next tick to avoid race conditions
     */
    return ctx.scheduler?.nextIdle(doNav), null
  }
  /**
   * push our callback in the sync nav queue,
   * causing it to be executed synchronously
   * during the router's useLayoutEffect
   */
  return routerCtx.queueSyncNav(doNav), null
}

interface RouterProps {
  basePath?: string
  children?: JSX.Children
}
const initLoc = () => ({
  pathname: window.location.pathname,
  search: window.location.search,
})
export function Router(props: RouterProps) {
  const syncNavQueue = useRef<Array<() => void>>([])
  const parentRouterContext = useContext(RouterContext, false)
  const dynamicParentPath = parentRouterContext.isDefault
    ? undefined
    : parentRouterContext.routePath
  const dynamicParentPathSegments = useMemo(
    () => dynamicParentPath?.split("/").filter(Boolean) || [],
    [dynamicParentPath]
  )

  const [loc, setLoc] = useState(initLoc)
  const query = useMemo(() => parseSearchParams(loc.search), [loc.search])
  const realPathSegments = useMemo(
    () => loc.pathname.split("/").filter(Boolean),
    [loc.pathname]
  )

  useLayoutEffect(() => {
    const handler = () => {
      setLoc({
        pathname: window.location.pathname,
        search: window.location.search,
      })
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [])

  useLayoutEffect(() => {
    while (syncNavQueue.current.length) {
      syncNavQueue.current.shift()!()
    }
  })

  type RouteComponent = Kaioken.VNode & {
    props: Kaioken.InferProps<typeof Route>
  }
  let fallbackRoute: RouteComponent | undefined
  let route: RouteComponent | undefined
  const _children = Array.isArray(props.children)
    ? props.children
    : [props.children]

  for (const child of _children) {
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
        dynamicParentPathSegments.concat(dynamicChildPathSegments),
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
      dynamicParentPathSegments.concat(dynamicChildPathSegments),
      realPathSegments
    )
  }
  const params = { ...parentRouterContext.params, ...parsedParams }

  return createElement(
    RouterContext.Provider,
    {
      value: {
        params,
        query,
        basePath: props.basePath,
        routePath:
          (dynamicParentPath || "") +
          (props.basePath || "") +
          (route?.props.path || ""),
        isDefault: false,
        queueSyncNav: (callback: () => void) => {
          syncNavQueue.current.push(callback)
        },
      } satisfies RouterCtx,
    },
    route ?? fallbackRoute ?? null
  )
}
