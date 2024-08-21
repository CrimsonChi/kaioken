import { AppContext, useEffect, useRequestUpdate } from "kaioken"
import { useDevtoolsStore, kaiokenGlobal } from "../store"
import { getNodeName } from "../utils"
import { NodeDataSection } from "./NodeDataSection"

export function SelectedNodeView() {
  const {
    value: { selectedApp, selectedNode },
    setSelectedNode,
  } = useDevtoolsStore(({ selectedApp, selectedNode }) => ({
    selectedApp,
    selectedNode,
  }))
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

  if (selectedNode === null) return null
  const props = { ...selectedNode.props } as Record<string, any>
  delete props.children

  return (
    <div className="flex-grow p-2 sticky top-0">
      <h2 className="font-bold mb-2 pb-2 border-b-2 border-neutral-800">
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
              const { name, debug, ...rest } = hookData
              const data = debug ? debug() : rest
              return (
                <div>
                  <b>{name || "anonymous hook"}</b>
                  <div className="p-2">
                    {Object.keys(data).map((key) => {
                      const value = data[key as keyof typeof data]
                      let vStr: string
                      switch (typeof value) {
                        case "string":
                          vStr = `"${value}"`
                          break
                        case "function":
                          vStr = `ƒ ${value.name || "anonymous"}()`
                          break
                        default:
                          vStr = JSON.stringify(value, null, 2)
                      }

                      return (
                        <div className="flex gap-2 mb-2">
                          <b className="p-2">{key}:</b>{" "}
                          <pre className="p-2 bg-neutral-800">{vStr}</pre>
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
