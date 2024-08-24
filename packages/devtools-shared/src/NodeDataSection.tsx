import { useState } from "kaioken"
import { Chevron } from "./Chevron"

export function NodeDataSection({
  title,
  children,
}: {
  title: string
  children: JSX.Children
}) {
  const [collapsed, setCollapsed] = useState(true)
  return (
    <div className="flex flex-col">
      <button
        onclick={(e) => {
          e.preventDefault()
          e.stopImmediatePropagation()
          setCollapsed((prev) => !prev)
        }}
      >
        <h3 className="cursor-pointer flex items-center gap-2">
          <Chevron className={`transition ${collapsed ? "" : "rotate-90"}`} />
          {title}
        </h3>
      </button>
      {collapsed ? null : <div className="p-2">{children}</div>}
    </div>
  )
}
