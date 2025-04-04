import { broadcastChannel, ExternalLinkIcon } from "devtools-shared"
import { getFileLink } from "devtools-shared/src/utils"
import { Store, signal, computed, useState, useLayoutEffect } from "kaioken"
import { Select } from "../components/Select"
import { kaiokenGlobal } from "../store"

type StoreSelection = {
  name: string
  store: Store<any, any>
}
const currentStore = signal<null | StoreSelection>(null)
const stores = signal<Record<string, Store<any, any>>>({})
kaiokenGlobal?.stores.subscribe((newStores) => {
  stores.value = newStores
  if (!currentStore.value) return
  if (currentStore.value.name in newStores) return

  // store was removed
  if (!Object.keys(newStores).length) return (currentStore.value = null)
  for (const [name, store] of Object.entries(newStores)) {
    currentStore.value = {
      name,
      store,
    }
    break
  }
})
const storeFileLink = computed(() => {
  if (!currentStore.value) return undefined
  return getFileLink(currentStore.value.store) ?? undefined
})

export function StoresTabView() {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-2 bg-neutral-800 border-b border-black border-opacity-30">
        <div className="flex items-center gap-4">
          <Select
            className="px-2 py-1 bg-[#333] text-white rounded border border-white border-opacity-10"
            value={currentStore.value?.name ?? ""}
            options={[
              { text: "Select Store", key: "", disabled: true },
              ...Object.keys(stores.value ?? {}),
            ]}
            onChange={(name) => {
              const store = stores.value[name]
              if (!store) return
              currentStore.value = { name, store }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {storeFileLink.value && (
            <a
              className="flex items-center gap-1 text-[10px] opacity-50 hover:opacity-100 transition-opacity"
              href={storeFileLink}
              onclick={(e) => {
                e.preventDefault()
                broadcastChannel.send({
                  type: "open-editor",
                  fileLink: storeFileLink.value!,
                })
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
