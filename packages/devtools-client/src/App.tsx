import { kaiokenGlobal, toggleElementToVnode, useDevtoolsStore } from "./store"
import { SelectedNodeView } from "devtools-shared"
import { AppView } from "./components/AppView"
import { Select } from "./components/Select"
import { FiftyFiftySplitter } from "./components/FiftyFiftySplitter"
import { SquareMouse } from "./icons/SquareMouse"

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

  const onInspectComponent = () => {
    if (!window.opener) return
    kaiokenGlobal?.emit(
      // @ts-expect-error We have our own custom type here
      "__kaiokenDevtoolsInspectElementValue",
      { value: true }
    )
  }

  return (
    <>
      <header className="p-2 bg-neutral-800 border-b border-black border-opacity-30 flex items-center gap-4">
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
          onclick={onInspectComponent}
          className={`p-1 rounded ${toggleElementToVnode.value ? "bg-neutral-900" : ""}`}
        >
          <SquareMouse />
        </button>
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
    </>
  )
}
