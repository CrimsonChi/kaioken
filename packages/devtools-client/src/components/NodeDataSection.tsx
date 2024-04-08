import { useState } from "kaioken"
import { Chevron } from "./chevron"

export function NodeDataSection({
  title,
  children,
}: {
  title: string
  children?: JSX.Element[]
}) {
  const [collapsed, setCollapsed] = useState(true)
  return (
    <div>
      <h3
        onclick={(e) => {
          e.preventDefault()
          e.stopImmediatePropagation()
          setCollapsed((prev) => !prev)
        }}
        className="cursor-pointer flex items-center gap-2"
      >
        <Chevron
          className="transform"
          style={{
            transform: "rotate(" + (collapsed ? 0 : 90) + "deg)",
          }}
        />
        {title}
      </h3>
      {collapsed ? null : <div className="p-2">{children}</div>}
    </div>
  )
}
