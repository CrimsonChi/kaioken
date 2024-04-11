import { useDevtoolsStore } from "./store"
import { SelectedNodeView } from "./components/SelectedNodeView"
import { AppView } from "./components/AppView"
import { Select } from "./components/Select"

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
      <header className="p-2 bg-neutral-700 border-b border-black border-opacity-30">
        <Select
          className="bg-neutral-800 text-white rounded"
          options={[
            { text: "Select App", key: "" },
            ...apps.map((app) => app.name),
          ]}
          value={selectedApp?.name ?? ""}
          onchange={(name) =>
            setSelectedApp(apps.find((a) => a.name === name)!)
          }
        />
      </header>
      <main className="flex-grow flex gap-2 items-start">
        {selectedApp && <AppView />}
        {selectedNode && <SelectedNodeView />}
      </main>
    </>
  )
}
