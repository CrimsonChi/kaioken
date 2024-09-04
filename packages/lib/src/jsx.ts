import { createElement } from "./element.js"

export { jsx }

function jsx(
  type: Kaioken.VNode["type"],
  { children, ...props } = {} as { children?: Kaioken.VNode[] }
) {
  if (!children) return createElement(type, props)
  return createElement(type, props, children)
}
