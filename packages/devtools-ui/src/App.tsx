import { useDevtoolsStore } from "./store"
import { SelectedNodeView } from "./components/SelectedNodeView"
import { AppView } from "./components/AppView"

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
      <main className="flex gap-2 items-start">
        <div className="p-2 sticky top-0">
          <h2 className="font-bold">App Selector</h2>
          <ul>
            {apps.map((app) => (
              <li
                className={`flex ${app === selectedApp ? "font-bold bg-primary" : ""}`}
              >
                <button onclick={() => setSelectedApp(app)}>{app.name}</button>
              </li>
            ))}
          </ul>
        </div>
        {selectedApp && <AppView />}
        {selectedNode && <SelectedNodeView />}
      </main>
    </>
  )
}
