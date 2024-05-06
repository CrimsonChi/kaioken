import { useState, fragment } from "kaioken"
import { useDevtoolsStore } from "../store"
import { getNodeName } from "../utils"
import { Chevron } from "./chevron"

export function NodeListItem({
  node,
  traverseSiblings = true,
}: {
  node: Kaioken.VNode
  traverseSiblings?: boolean
}) {
  const { value: selectedNode, setSelectedNode } = useDevtoolsStore(
    (state) => state.selectedNode,
    (prev, next) => {
      return prev === node || next === node
    }
  )
  const [collapsed, setCollapsed] = useState(true)

  if (!node) return null
  if (
    typeof node.type !== "function" ||
    (node.type as Function).name === "fragment"
  )
    return (
      <>
        {node.child && <NodeListItem node={node.child} />}
        {traverseSiblings && <NodeListItemSiblings node={node} />}
      </>
    )

  const isSelected = selectedNode === node

  return (
    <>
      <div className="pl-4 mb-1">
        <h2
          onclick={() => setSelectedNode(isSelected ? null : (node as any))}
          className={`flex gap-2 items-center cursor-pointer mb-1 ${isSelected ? "font-medium bg-primary" : ""}`}
        >
          {node.child && (
            <Chevron
              className="cursor-pointer transform"
              style={{
                transform: "rotate(" + (collapsed ? 0 : 90) + "deg)",
              }}
              onclick={(e) => {
                e.preventDefault()
                e.stopImmediatePropagation()
                setCollapsed((prev) => !prev)
              }}
            />
          )}
          <div>
            <span className={isSelected ? "" : "text-neutral-400"}>{"<"}</span>
            <span className={isSelected ? "" : "text-primary"}>
              {getNodeName(node)}
            </span>
            <span className={isSelected ? "" : "text-neutral-400"}>{">"}</span>
          </div>
        </h2>
        {collapsed || !node.child ? null : <NodeListItem node={node.child} />}
      </div>
      {traverseSiblings && <NodeListItemSiblings node={node} />}
    </>
  )
}
function NodeListItemSiblings({ node }: { node?: Kaioken.VNode }) {
  if (!node) return null
  let nodes = []
  let n: Kaioken.VNode | undefined = node.sibling
  while (n) {
    nodes.push(n)
    n = n.sibling
  }
  return fragment({
    children: nodes.map((n) => (
      <NodeListItem node={n} traverseSiblings={false} />
    )),
  })
}
