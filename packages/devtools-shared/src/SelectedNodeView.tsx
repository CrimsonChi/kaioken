import { AppContext, Signal, useEffect, useRequestUpdate } from "kaioken"
import { applyObjectChangeFromKeys, getNodeName } from "./utils"
import { NodeDataSection } from "./NodeDataSection"
import { RefreshIcon } from "./RefreshIcon"
import { ValueEditor } from "./ValueEditor"

type SelectedNodeViewProps = {
  selectedApp: AppContext
  selectedNode: Kaioken.VNode & { type: Function }
  setSelectedNode: (node: (Kaioken.VNode & { type: Function }) | null) => void
  kaiokenGlobal: typeof window.__kaioken
}

type DisplayGroupHook = Kaioken.Hook<{
  name: "devtools:useHookDebugGroup"
  displayName: string
  action: "start" | "end"
}>
type HookGroupNode = {
  parent: HookGroupNode | null
  name: string
  children: (Kaioken.Hook<any> | HookGroupNode)[]
  [hookGroupSymbol]: true
}
function isDisplayGroupHook(hook: Kaioken.Hook<any>): hook is DisplayGroupHook {
  return hook.name === "devtools:useHookDebugGroup"
}
function isHookGroupNode(
  node: HookGroupNode | Kaioken.Hook<any>
): node is HookGroupNode {
  return hookGroupSymbol in node
}

function buildName(groupNode: HookGroupNode) {
  let name = groupNode.name
  let parent = groupNode.parent
  while (parent) {
    name = parent.name + "." + name
    parent = parent.parent
  }
  return name
}

const hookGroupSymbol = Symbol.for("devtools.hookGroup")

function makeHookTree(node: Kaioken.VNode) {
  const root: HookGroupNode = {
    parent: null,
    name: "Hooks",
    children: [],
    [hookGroupSymbol]: true,
  }
  if (node.hooks?.length) {
    let currentParent = root
    for (let i = 0; i < node.hooks.length; i++) {
      const hook = node.hooks[i]
      if (isDisplayGroupHook(hook)) {
        switch (hook.action) {
          case "start":
            const node: HookGroupNode = {
              parent: currentParent,
              name: hook.displayName,
              children: [],
              [hookGroupSymbol]: true,
            }
            currentParent.children.push(node)
            currentParent = node
            break
          case "end":
            if (
              currentParent.name !== hook.displayName ||
              currentParent.parent === null
            ) {
              throw new Error("useHookDebugGroup:end called with no start")
            }
            currentParent = currentParent.parent
            break
        }
        continue
      }

      currentParent.children.push(hook)
    }
  }
  return root
}

export function SelectedNodeView({
  selectedApp,
  selectedNode,
  setSelectedNode,
  kaiokenGlobal,
}: SelectedNodeViewProps) {
  const requestUpdate = useRequestUpdate()

  useEffect(() => {
    const handleUpdate = (appCtx: AppContext) => {
      if (appCtx !== selectedApp) return
      if (selectedNode?.effectTag === 3) {
        setSelectedNode(null)
      } else {
        requestUpdate()
      }
    }

    kaiokenGlobal?.on("update", handleUpdate)
    return () => kaiokenGlobal?.off("update", handleUpdate)
  }, [])

  const refresh = () => {
    if (!selectedNode || !selectedApp?.mounted) return
    selectedApp.requestUpdate(selectedNode)
  }

  if (selectedNode === null) return null
  const nodeProps = { ...selectedNode.props } as Record<string, any>
  delete nodeProps.children

  const nodeHookTree = makeHookTree(selectedNode)

  return (
    <div className="flex-grow p-2 sticky top-0">
      <h2 className="flex justify-between items-center font-bold mb-2 pb-2 border-b-2 border-neutral-800">
        {"<" + getNodeName(selectedNode) + ">"}
        <button onclick={refresh}>
          <RefreshIcon className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity" />
        </button>
      </h2>
      <NodeDataSection title="props">
        <pre className="p-2 bg-neutral-800">
          {JSON.stringify(nodeProps, null, 2)}
        </pre>
      </NodeDataSection>
      {nodeHookTree.children.length > 0 && (
        <HookTreeDisplay node={nodeHookTree} selectedApp={selectedApp} />
      )}

      {selectedNode.subs && selectedNode.subs.length > 0 && (
        <NodeDataSection title="signal subscriptions">
          <div className="text-sm">
            {selectedNode.subs.map((signal) => (
              <div>
                <b>{signal.displayName || "anonymous signal"}</b>
                <div className="p-2">
                  <ValueEditor
                    data={{
                      value: (signal.constructor as typeof Signal).getValue(
                        signal
                      ),
                    }}
                    onChange={(keys, newVal) => {
                      const _v = {
                        value: signal.value,
                      }
                      applyObjectChangeFromKeys(_v, keys, newVal)
                      ;(signal.constructor as typeof Signal).setValueSilently(
                        signal,
                        _v.value
                      )
                    }}
                    mutable={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </NodeDataSection>
      )}
    </div>
  )
}

function HookTreeDisplay({
  node,
  selectedApp,
  depth = 0,
}: {
  node: HookGroupNode | Kaioken.Hook<any>
  selectedApp: AppContext
  depth?: number
}) {
  if (isHookGroupNode(node)) {
    return (
      <NodeDataSection
        title={node.name}
        className={`flex flex-col gap-2 ${depth > 0 ? "pl-12" : "pl-6"}`}
      >
        {node.children.map((child) => (
          <HookTreeDisplay
            key={buildName(node) + child.name}
            node={child}
            selectedApp={selectedApp}
            depth={depth + 1}
          />
        ))}
      </NodeDataSection>
    )
  }
  const { name, debug, ...rest } = node
  const data = debug?.get ? debug.get() : rest

  const handleChange = (keys: string[], value: unknown) => {
    if (!selectedApp?.mounted || !debug?.set) return
    const data = debug.get()
    applyObjectChangeFromKeys(data, keys, value)
    debug.set(data)
  }

  return (
    <div>
      <b>{name || "anonymous hook"}</b>
      <div className="p-2">
        <ValueEditor
          data={data}
          onChange={handleChange}
          mutable={!!debug?.set}
        />
      </div>
    </div>
  )
}
