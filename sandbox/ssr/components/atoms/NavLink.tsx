import { ElementProps } from "kaioken"

export function NavLink({ children, ...props }: ElementProps<"a">) {
  return (
    <a className="text-xs underline" {...props}>
      {children}
    </a>
  )
}
