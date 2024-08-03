import type { ElementProps } from "../types"
import { createElement } from "../element.js"
import { navigate } from "./navigate.js"

export interface LinkProps extends ElementProps<"a"> {
  to: string
}
export function Link(props: LinkProps) {
  return createElement(
    "a",
    {
      href: props.to,
      onclick: (e: Event) => {
        e.preventDefault()
        navigate(props.to)
      },
      ...props,
    },
    ...(!("children" in props)
      ? []
      : Array.isArray(props.children)
        ? props.children
        : [props.children])
  )
}
