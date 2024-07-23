import type { ElementProps } from "../types"
import { createElement } from "../element.js"
import { navigate } from "./navigate.js"

export interface LinkProps extends ElementProps<"a"> {
  to: string
}
export function Link({ to, children, ...props }: LinkProps) {
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
    ...((children as Array<JSX.Element>) ?? [])
  )
}
