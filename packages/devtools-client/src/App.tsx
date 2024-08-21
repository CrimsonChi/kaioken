import { useDevtoolsStore } from "./store"
import { SelectedNodeView } from "./components/SelectedNodeView"
import { AppView } from "./components/AppView"
import { Select } from "./components/Select"
import { FiftyFiftySplitter } from "./components/FitfyFitfySpliter"

export function App() {
  const {
    value: { apps, selectedApp, selectedNode },
    setSelectedApp,
  } = useDevtoolsStore(({ apps, selectedApp, selectedNode }) => ({
    apps,
    selectedApp,
    selectedNode,
  }))

  return (
    <>
      <header className="p-2 bg-neutral-800 border-b border-black border-opacity-30">
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
      </header>
      <FiftyFiftySplitter>
        {selectedApp && <AppView />}
        {selectedNode && <SelectedNodeView />}
      </FiftyFiftySplitter>
    </>
  )
}
