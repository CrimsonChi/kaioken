import { useState, useEffect, createElement } from "../src"
import { isVNode } from "./utils"
import type { Rec, VNode } from "./types"

interface RouterProps {
  basePath?: string
  children?: JSX.Element[]
}

export function Router({ basePath = "", children = [] }: RouterProps) {
  const [route, setRoute] = useState(basePath + window.location.pathname)

  useEffect(() => {
    const handler = () => {
      setRoute(basePath + window.location.pathname)
    }
    window.addEventListener("popstate", handler)

    return () => {
      window.removeEventListener("popstate", handler)
    }
  }, [])

  const child = children.find(
    (child) => isVNode(child) && child.props.path === route
  ) as VNode | undefined

  if (!child?.type) return null

  return child.props.element({ params: { test: "test" } })
}

type ComponentFunc = ({ params }: { params: Rec }) => JSX.Element

interface RouteProps {
  path: string
  element: ComponentFunc
}

export function Route({ path, element }: RouteProps) {
  return {
    type: "Route",
    props: {
      path,
      element,
      children: [],
    },
    hooks: [],
  }
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
