import { AppContext, useEffect, useMemo, useRequestUpdate } from "kaioken"
import {
  applyObjectChangeFromKeys,
  getComponentFileLink,
  getNodeName,
} from "./utils"
import { NodeDataSection } from "./NodeDataSection"
import { RefreshIcon } from "./RefreshIcon"
import { ValueEditor } from "./ValueEditor"
import { ExternalLinkIcon } from "./ExternalLinkIcon"

type SelectedNodeViewProps = {
  selectedApp: AppContext
  selectedNode: Kaioken.VNode & { type: Function }
  setSelectedNode: (node: (Kaioken.VNode & { type: Function }) | null) => void
  kaiokenGlobal: typeof window.__kaioken
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

  const fileLink = useMemo<string | null>(
    () => getComponentFileLink(selectedNode),
    [selectedNode]
  )

  const refresh = () => {
    if (!selectedNode || !selectedApp?.mounted) return
    selectedApp.requestUpdate(selectedNode)
  }

  const nodeProps = { ...selectedNode.props } as Record<string, any>
  delete nodeProps.children

  const nodeHookTree = makeHookTree(selectedNode)

  return (
    <div className="flex-grow p-2 sticky top-0">
      <h2 className="flex justify-between items-center font-bold mb-2 pb-2 border-b-2 border-neutral-800">
        <div className="flex gap-2 items-center">
          {"<" + getNodeName(selectedNode) + ">"}
          {fileLink && (
            <a
              className="flex items-center gap-1 text-[10px] opacity-50 hover:opacity-100 transition-opacity"
              href={fileLink}
              onclick={(e) => {
                e.preventDefault()
                // @ts-expect-error we have our own event
                kaiokenGlobal?.emit("devtools:openEditor", fileLink)
              }}
              //target="_top"
              title="Open in editor"
            >
              Open in editor
              <ExternalLinkIcon width="0.65rem" height="0.65rem" />
            </a>
          )}
        </div>
        <button onclick={refresh}>
          <RefreshIcon className="w-5 h-5" />
        </button>
      </h2>
      <NodeDataSection
        title="props"
        disabled={Object.keys(nodeProps).length === 0}
      >
        <ValueEditor
          data={nodeProps}
          onChange={() => {}}
          mutable={false}
          objectRefAcc={[]}
        />
      </NodeDataSection>
      <HookTreeDisplay node={nodeHookTree} selectedApp={selectedApp} />
      <NodeDataSection
        title="signal subscriptions"
        disabled={!selectedNode.subs || selectedNode.subs.length === 0}
      >
        <div className="text-sm">
          {selectedNode.subs?.map((signal) => (
            <div>
              <b>{signal.displayName || "anonymous signal"}</b>
              <div className="p-2">
                <ValueEditor
                  data={{
                    value: signal.peek(),
                  }}
                  onChange={(keys, newVal) => {
                    const _v = {
                      value: signal.value,
                    }
                    applyObjectChangeFromKeys(_v, keys, newVal)
                    signal.sneak(_v.value)
                  }}
                  mutable={true}
                  objectRefAcc={[]}
                />
              </div>
            </div>
          ))}
        </div>
      </NodeDataSection>
    </div>
  )
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

const hookGroupSymbol = Symbol.for("devtools.hookGroup")
function makeHookTree(node: Kaioken.VNode) {
  const root: HookGroupNode = {
    parent: null,
    name: "hooks",
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
        className={`bg-[#ffffff04] border border-[#fff1] flex flex-col gap-2 pl-6`}
        disabled={node.children.length === 0}
      >
        {node.children.map((child) => (
          <HookTreeDisplay
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
      <i className="text-neutral-300 text-sm">{name || "anonymous hook"}</i>
      <div className="p-2">
        <ValueEditor
          data={data}
          onChange={handleChange}
          mutable={!!debug?.set}
          objectRefAcc={[]}
        />
      </div>
    </div>
  )
}
