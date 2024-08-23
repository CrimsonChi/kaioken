import { kaiokenGlobal, useDevtoolsStore } from "./store"
import { SelectedNodeView } from "./components/SelectedNodeView"
import { AppView } from "./components/AppView"
import { Select } from "./components/Select"
import { FiftyFiftySplitter } from "./components/FitfyFitfySpliter"
import { SquareMouse } from "./icons/SquareMouse"

export function App() {
  const {
    value: { apps, selectedApp, selectedNode },
    setSelectedApp,
  } = useDevtoolsStore(({ apps, selectedApp, selectedNode }) => ({
    apps,
    selectedApp,
    selectedNode,
  }))

  const onInspectComponent = () => {
    // @ts-expect-error We have our own custom type here
    kaiokenGlobal?.emit(
      "__kaiokenDevtoolsInsepctElementToggle",
      kaiokenGlobal.apps[0]
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
        <button onclick={onInspectComponent}>
          <SquareMouse />
        </button>
      </header>
      <FiftyFiftySplitter>
        {selectedApp && <AppView />}
        {selectedNode && <SelectedNodeView />}
      </FiftyFiftySplitter>
    </>
  )
}
