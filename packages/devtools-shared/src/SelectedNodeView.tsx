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
      <NodeDataSection title="hooks">
        {selectedNode.hooks && (
          <div className="text-sm">
            {selectedNode.hooks.map((hookData) => {
              const { name, debug, ...rest } = hookData
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
            })}
          </div>
        )}
      </NodeDataSection>
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
