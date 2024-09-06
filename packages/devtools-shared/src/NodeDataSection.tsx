import { type ElementProps, useState } from "kaioken"
import { Chevron } from "./Chevron"

type NodeDataSectionProps = {
  title: string
  children: JSX.Children
  disabled?: boolean
} & ElementProps<"div">

export function NodeDataSection({
  title,
  children,
  className,
  disabled,
  ...rest
}: NodeDataSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  return (
    <div className="flex flex-col">
      <button
        onclick={(e) => {
          e.preventDefault()
          e.stopImmediatePropagation()
          setCollapsed((prev) => !prev)
        }}
        disabled={disabled}
        className={`${disabled ? "opacity-50" : ""}`}
      >
        <h3 className="cursor-pointer flex items-center gap-2">
          <Chevron className={`transition ${collapsed ? "" : "rotate-90"}`} />
          {title}
        </h3>
      </button>
      {collapsed ? null : (
        <div className={`p-2 ${className || ""}`} {...rest}>
          {children}
        </div>
      )}
    </div>
  )
}
