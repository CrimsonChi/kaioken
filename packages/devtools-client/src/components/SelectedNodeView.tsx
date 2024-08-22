import { AppContext, useEffect, useRequestUpdate } from "kaioken"
import { useDevtoolsStore, kaiokenGlobal } from "../store"
import { getNodeName } from "../utils"
import { NodeDataSection } from "./NodeDataSection"
import { RefreshIcon } from "./RefreshIcon"
import { ValueEditor } from "./ValueEditor"

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

  const refresh = () => {
    if (!selectedNode || !selectedApp?.mounted) return
    selectedApp.requestUpdate(selectedNode)
  }

  if (selectedNode === null) return null
  const props = { ...selectedNode.props } as Record<string, any>
  delete props.children

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
          {JSON.stringify(props, null, 2)}
        </pre>
      </NodeDataSection>
      <NodeDataSection title="state">
        {selectedNode.hooks && (
          <div className="text-sm">
            {selectedNode.hooks.map((hookData) => {
              const { name, debug, ...rest } = hookData
              const data = debug?.get ? debug.get() : rest

              const handleChange = (keys: string[], value: unknown) => {
                if (!selectedApp?.mounted || !debug?.set) return
                const shallowCloned = { ...hookData }
                let o = shallowCloned as any
                for (let i = 0; i < keys.length; i++) {
                  const key = keys[i]
                  if (i === keys.length - 1) {
                    o[key as any] = value
                  } else {
                    o = o[key]
                  }
                }
                debug.set(shallowCloned)
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
                    {/* {Object.keys(data).map((key) => {
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
                    })} */}
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
