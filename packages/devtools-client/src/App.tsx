import { kaiokenGlobal, toggleElementToVnode, useDevtoolsStore } from "./store"
import {
  AppViewIcon,
  CogIcon,
  ExternalLinkIcon,
  SelectedNodeView,
  SettingsProvider,
  StoresViewIcon,
} from "devtools-shared"
import { AppVDomView } from "./components/AppVDomView"
import { Select } from "./components/Select"
import { FiftyFiftySplitter } from "./components/FiftyFiftySplitter"
import { SquareMouse } from "./icons/SquareMouse"
import { SettingsDrawer } from "devtools-shared/src/Settings"
import {
  type AppContext,
  signal,
  type Store,
  useComputed,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRequestUpdate,
  useSignal,
  useState,
} from "kaioken"
import { inspectComponent } from "./signal"
import { getFileLink } from "devtools-shared/src/utils"

const handleToggleInspect = () => {
  if (!window.opener) return
  kaiokenGlobal?.emit(
    // @ts-expect-error We have our own custom type here
    "devtools:toggleInspect",
    { value: !toggleElementToVnode.value }
  )
}

const APP_TABS = {
  Apps: {
    Icon: AppViewIcon,
    View: AppView,
  },
  Stores: {
    Icon: StoresViewIcon,
    View: StoresView,
  },
}

const selectedTab = signal<keyof typeof APP_TABS>("Apps")

export function App() {
  const View = APP_TABS[selectedTab.value].View
  return (
    <>
      <nav className="flex flex-col gap-2 p-2 bg-[#1e1e1e] border-r border-neutral-900">
        {Object.keys(APP_TABS).map((key) => (
          <TabButton key={key} title={key as keyof typeof APP_TABS} />
        ))}
      </nav>
      <main className="flex flex-col flex-1 max-h-screen overflow-y-auto">
        <View />
      </main>
    </>
  )
}

function TabButton({ title }: { title: keyof typeof APP_TABS }) {
  const { Icon } = APP_TABS[title]
  return (
    <button
      key={title}
      onclick={() => {
        selectedTab.value = title
      }}
      className={
        "flex items-center px-2 py-1 gap-2 rounded border text-xs border-white border-opacity-10" +
        (selectedTab.value === title
          ? " bg-white bg-opacity-5 text-neutral-100"
          : " hover:bg-white hover:bg-opacity-10 text-neutral-400")
      }
      title={title}
    >
      <Icon className="text-primary" />
      {title}
    </button>
  )
}

type StoreSelection = {
  name: string
  store: Store<any, any>
}

function StoresView() {
  const currentStore = useSignal<null | StoreSelection>(null)
  const stores = useSignal<null | Map<string, Store<any, any>>>(null)

  const onStoresChanged = (newStores: Map<string, Store<any, any>>) => {
    if (!currentStore.value) return
    if (newStores.has(currentStore.value.name)) return

    // store was removed
    if (!newStores.size) return (currentStore.value = null)
    for (const [name, store] of newStores) {
      currentStore.value = {
        name,
        store,
      }
      break
    }
  }

  useEffect(() => {
    const unsub = kaiokenGlobal?.stores.subscribe((values) => {
      stores.value = values
      onStoresChanged(values)
    })
    return () => unsub?.()
  }, [])

  console.log("rendering stores view", stores.value)

  const fileLink = useComputed(() => {
    if (!currentStore.value) return undefined
    return getFileLink(currentStore.value.store) ?? undefined
  })

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-2 bg-neutral-800 border-b border-black border-opacity-30">
        <div className="flex items-center gap-4">
          <Select
            className="px-2 py-1 bg-[#333] text-white rounded border border-white border-opacity-10"
            value={currentStore.value?.name ?? ""}
            options={[
              { text: "Select Store", key: "", disabled: true },
              ...(stores.value?.keys() ?? []),
            ]}
            onChange={(name) => {
              const store = stores.value?.get(name)
              if (!store) return
              currentStore.value = {
                name,
                store,
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {fileLink.value && (
            <a
              className="flex items-center gap-1 text-[10px] opacity-50 hover:opacity-100 transition-opacity"
              href={fileLink}
              onclick={(e) => {
                e.preventDefault()
                // @ts-expect-error we have our own event
                kaiokenGlobal?.emit("devtools:openEditor", fileLink)
              }}
              //target="_top"
              title="Open in editor"
            >
              Open in editor
              <ExternalLinkIcon width="0.65rem" height="0.65rem" />
            </a>
          )}
        </div>
      </div>
      {currentStore.value ? (
        <StoreView
          key={`${currentStore.value.name}:${getFileLink(
            currentStore.value.store
          )}`}
          selection={currentStore.value}
        />
      ) : null}
    </>
  )
}

function StoreView({ selection }: { selection: StoreSelection }) {
  const { store } = selection
  const [storeState, setStoreState] = useState(() =>
    JSON.stringify(store.getState(), null, 2)
  )
  useLayoutEffect(() => {
    const unsub = store.subscribe((s) => {
      setStoreState(JSON.stringify(s, null, 2))
    })
    return () => unsub()
  }, [])
  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <pre className="p-2">{storeState}</pre>
    </div>
  )
}

function AppView() {
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
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-2 bg-neutral-800 border-b border-black border-opacity-30">
            <div className="flex items-center gap-4">
              <Select
                className="px-2 py-1 bg-[#333] text-white rounded border border-white border-opacity-10"
                options={[
                  { text: "Select App", key: "", disabled: true },
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
                className={`p-1 rounded ${
                  toggleElementToVnode.value ? "bg-neutral-900" : ""
                }`}
              >
                <SquareMouse />
              </button>
            </div>
            <div>
              <button onclick={() => settingsCtx.setOpen(!settingsCtx.open)}>
                <CogIcon />
              </button>
            </div>
          </div>
          <FiftyFiftySplitter>
            {selectedApp && <AppVDomView />}
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
