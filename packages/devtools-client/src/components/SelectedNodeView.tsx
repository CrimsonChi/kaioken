import { AppContext, useEffect } from "kaioken"
import { getCurrentNode, getNodeAppContext } from "kaioken/dist/utils"
import { useDevtoolsStore, kaiokenGlobal } from "../store"
import { getNodeName } from "../utils"
import { NodeDataSection } from "./NodeDataSection"

export function SelectedNodeView() {
  const {
    value: { selectedApp, selectedNode },
  } = useDevtoolsStore(({ selectedApp, selectedNode }) => ({
    selectedApp,
    selectedNode,
  }))
  const node = getCurrentNode()
  const ctx = getNodeAppContext(node!)

  function handleUpdate(appCtx: AppContext) {
    if (appCtx !== selectedApp || !node) return
    ctx?.requestUpdate(node)
  }

  useEffect(() => {
    kaiokenGlobal?.on("update", handleUpdate)
    return () => kaiokenGlobal?.off("update", handleUpdate)
  }, [])

  if (selectedNode === null) return null
  const props = { ...selectedNode.props } as Record<string, any>
  delete props.children
  return (
    <div className="flex-grow p-2 sticky top-0">
      <h2 className="font-bold border-b border-neutral-800">
        {"<" + getNodeName(selectedNode) + ">"}
      </h2>
      <NodeDataSection title="props">
        <pre className="p-2 bg-neutral-800">
          {JSON.stringify(props, null, 2)}
        </pre>
      </NodeDataSection>
      <NodeDataSection title="state">
        {selectedNode.hooks && (
          <div className="text-sm">
            {selectedNode.hooks.map((hookData) => {
              const data = { ...hookData }
              const name = data.name
              delete data.name
              return (
                <div>
                  <b>{name || "anonymous hook"}</b>
                  <div className="p-2">
                    {Object.keys(data).map((key) => {
                      const value = data[key as keyof typeof data]
                      if (typeof value === "function") return null
                      return (
                        <div className="flex gap-2 mb-2">
                          <b className="p-2">{key}:</b>{" "}
                          <pre className="p-2 bg-neutral-800">
                            {Array.isArray(value)
                              ? JSON.stringify(value)
                              : JSON.stringify(value, null, 2)}
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </NodeDataSection>
    </div>
  )
}
