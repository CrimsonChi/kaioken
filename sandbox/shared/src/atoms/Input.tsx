import { ElementProps } from "kaioken"

export function Input({
  className = "",
  type = "text",
  ref,
  ...props
}: ElementProps<"input">) {
  return (
    <input
      type={type}
      className={"flex h-9 px-2 rounded-md border " + className}
      ref={ref}
      {...props}
    />
  )
}
