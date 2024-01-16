import { type ElementProps } from "kaioken"

type ButtonVariant = "primary" | "secondary" | "danger" | "success"

export function PrimaryButton({
  className,
  children,
  ...props
}: ElementProps<"button">) {
  return (
    <button
      {...props}
      className={`bg-blue-500 hover:bg-blue-700 text-white font-bold text-sm py-2 px-4 rounded ${
        className || ""
      }`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  className,
  children,
  ...props
}: ElementProps<"button">) {
  return (
    <button
      {...props}
      className={`bg-gray-500 hover:bg-gray-700 text-white font-bold text-sm py-2 px-4 rounded ${
        className || ""
      }`}
    >
      {children}
    </button>
  )
}

export function DangerButton({
  className,
  children,
  ...props
}: ElementProps<"button">) {
  return (
    <button
      {...props}
      className={`bg-red-500 hover:bg-red-700 text-white font-bold text-sm py-2 px-4 rounded ${
        className || ""
      }`}
    >
      {children}
    </button>
  )
}

export function SuccessButton({
  className,
  children,
  ...props
}: ElementProps<"button">) {
  return (
    <button
      {...props}
      className={`bg-green-500 hover:bg-green-700 text-white font-bold text-sm py-2 px-4 rounded ${
        className || ""
      }`}
    >
      {children}
    </button>
  )
}

export function DefaultButton({
  className,
  children,
  ...props
}: ElementProps<"button">) {
  return (
    <button
      {...props}
      className={`bg-gray-200 hover:bg-gray-400 text-gray-800 font-bold text-sm py-2 px-4 rounded ${
        className || ""
      }`}
    >
      {children}
    </button>
  )
}

export function Button({
  variant,
  children,
  ...props
}: ElementProps<"button"> & { variant?: ButtonVariant }) {
  switch (variant) {
    case "primary":
      return <PrimaryButton {...props}>{children}</PrimaryButton>
    case "secondary":
      return <SecondaryButton {...props}>{children}</SecondaryButton>
    case "danger":
      return <DangerButton {...props}>{children}</DangerButton>
    case "success":
      return <SuccessButton {...props}>{children}</SuccessButton>
    default:
      return <DefaultButton {...props}>{children}</DefaultButton>
  }
}
