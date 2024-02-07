import { ElementProps } from "kaioken"

export function PageTitle({ children }: ElementProps<"h1">) {
  return (
    <>
      <h1 className="text-xl font-bold">{children}</h1>
      <hr className="my-4 opacity-50 border" />
    </>
  )
}
