import { isVNode } from "../utils.js"

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
  element: JSX.Element
}
export function Route({ element }: RouteProps) {
  return element
}

export function isRoute(
  thing: unknown
): thing is Kaioken.VNode & { props: RouteProps } {
  return isVNode(thing) && thing.type === Route
}
