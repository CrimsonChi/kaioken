import { ElementProps } from "kaioken"

export interface InputProps extends ElementProps<"input"> {}

export function Input({
  className = "",
  type = "text",
  ref,
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      className={"flex h-9 px-2 rounded-md border " + className}
      ref={ref}
      {...props}
    />
  )
}
