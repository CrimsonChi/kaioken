import { ElementProps } from "kaioken"

export function Avatar({
  url,
  size = 50,
  className,
}: { url: string; size?: number } & ElementProps<"div">) {
  return (
    <div
      className={`flex p-2 rounded-full bg-white bg-opacity-15 w-fit ${className || ""}`}
    >
      <img src={url} width={size} height={size} />
    </div>
  )
}
