import type { ElementProps } from "../types"
import { createElement } from "../element.js"
import { navigate } from "./navigate.js"

export interface LinkProps extends ElementProps<"a"> {
  to: string
  onclick?: (e: Event) => void
  replace?: boolean
}
export function Link(props: LinkProps) {
  return createElement("a", {
    ...props,
    href: props.to,
    onclick: (e: Event) => {
      e.preventDefault()
      navigate(props.to, { replace: props.replace })
      props.onclick?.(e)
    },
  })
}
