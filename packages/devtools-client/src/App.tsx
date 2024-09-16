import { kaiokenGlobal, toggleElementToVnode, useDevtoolsStore } from "./store"
import { CogIcon, SelectedNodeView, SettingsProvider } from "devtools-shared"
import { AppView } from "./components/AppView"
import { Select } from "./components/Select"
import { FiftyFiftySplitter } from "./components/FiftyFiftySplitter"
import { SquareMouse } from "./icons/SquareMouse"
import { SettingsDrawer } from "devtools-shared/src/Settings"
import { type AppContext, useEffect, useRequestUpdate } from "kaioken"
import { inspectComponent } from "./signal"

const handleToggleInspect = () => {
  if (!window.opener) return
  kaiokenGlobal?.emit(
    // @ts-expect-error We have our own custom type here
    "devtools:toggleInspect",
    { value: !toggleElementToVnode.value }
  )
}

export function App() {
  const {
    value: { apps, selectedApp, selectedNode },
    setSelectedApp,
    setSelectedNode,
  } = useDevtoolsStore(({ apps, selectedApp, selectedNode }) => ({
    apps,
    selectedApp,
    selectedNode,
  }))

  const requestUpdate = useRequestUpdate()
  useEffect(() => {
    const handleUpdate = (appCtx: AppContext) => {
      if (appCtx !== selectedApp) return
      requestUpdate()
    }
    kaiokenGlobal?.on("update", handleUpdate)
    return () => kaiokenGlobal?.off("update", handleUpdate)
  }, [selectedApp])

  useEffect(() => {
    const handleSelectNode = (
      ctx: AppContext,
      vnode: Kaioken.VNode & { type: Function }
    ) => {
      setSelectedApp(ctx)
      setSelectedNode(vnode)
      inspectComponent.value = vnode
      toggleElementToVnode.value = false
    }
    // @ts-expect-error
    kaiokenGlobal?.on("devtools:selectNode", handleSelectNode)
    // @ts-expect-error
    return () => kaiokenGlobal?.off("devtools:selectNode", handleSelectNode)
  }, [selectedApp])

  return (
    <SettingsProvider>
      {(settingsCtx) => (
        <>
          <header className="flex items-center justify-between gap-4 p-2 bg-neutral-800 border-b border-black border-opacity-30">
            <div className="flex items-center gap-4 p-2">
              <Select
                className="bg-neutral-700 text-white rounded"
                options={[
                  { text: "Select App", key: "" },
                  ...apps.map((app) => app.name),
                ]}
                value={selectedApp?.name ?? ""}
                onChange={(name) =>
                  setSelectedApp(apps.find((a) => a.name === name)!)
                }
              />
              <button
                title="Toggle Component Inspection"
                onclick={handleToggleInspect}
                className={`p-1 rounded ${toggleElementToVnode.value ? "bg-neutral-900" : ""}`}
              >
                <SquareMouse />
              </button>
            </div>
            <div>
              <button onclick={() => settingsCtx.setOpen(!settingsCtx.open)}>
                <CogIcon />
              </button>
            </div>
          </header>
          <FiftyFiftySplitter>
            {selectedApp && <AppView />}
            {selectedNode && selectedApp && (
              <SelectedNodeView
                selectedApp={selectedApp}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                kaiokenGlobal={kaiokenGlobal}
              />
            )}
          </FiftyFiftySplitter>
          <SettingsDrawer />
        </>
      )}
    </SettingsProvider>
  )
}
