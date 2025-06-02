import { ElementProps } from "kaioken"

export function Backdrop({ children, ...props }: ElementProps<"div">) {
  return (
    <div {...props} className="backdrop">
      {children}
    </div>
  )
}
