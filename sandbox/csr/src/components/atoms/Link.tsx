import { Link as L, LinkProps } from "kaioken"

export function Link(props: LinkProps) {
  return (
    <L className="text-blue-500" {...props}>
      {props.children}
    </L>
  )
}
