import { type ElementProps } from "kaioken"

export function PageTitle({ className, children }: ElementProps<"h1">) {
  return <h1 className={`text-5xl ${className ?? ""}`}>{children}</h1>
}
