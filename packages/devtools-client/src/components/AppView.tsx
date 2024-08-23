import { AppContext, signal, useEffect, useRequestUpdate } from "kaioken"
import { useDevtoolsStore, kaiokenGlobal } from "../store"
import { NodeListItem } from "./NodeListItem"
import { useKeyboardControls } from "../hooks/KeyboardControls"
import { SearchContext } from "../context"
import { inspectComponent } from "../signal"

export function AppView() {
  const {
    value: app,
    setSelectedNode,
    setSelectedApp,
  } = useDevtoolsStore((state) => state.selectedApp)
  const requestUpdate = useRequestUpdate()
  const search = signal("")

  function handleUpdate(appCtx: AppContext) {
    if (appCtx !== app) return
    requestUpdate()
  }

  useEffect(() => {
    kaiokenGlobal?.on("update", handleUpdate)
    // @ts-expect-error
    kaiokenGlobal?.on(
      "__kaiokenDevtoolsInsepctElementNode",
      (ctx, vnode: Kaioken.VNode) => {
        console.log(vnode, ctx)
        setSelectedApp(ctx)
        setSelectedNode(vnode as any)
        inspectComponent.value = vnode
        search.value = ""
      }
    )

    return () => {
      // clean up all events dick head
      kaiokenGlobal?.off("update", handleUpdate)
    }
  }, [])

  useEffect(() => {
    if (inspectComponent.value) inspectComponent.value = null
  }, [search.value])

  const { searchRef } = useKeyboardControls()

  return (
    <div className="flex-grow p-2 sticky top-0">
      <div className="flex gap-4 pb-2 border-b-2 border-neutral-800 mb-2 items-center">
        <h2 className="font-bold flex-shrink-0">App View</h2>
        <input
          ref={searchRef}
          className="bg-[#171616] px-1 py-2 w-full focus:outline focus:outline-primary"
          placeholder="Search for component"
          type="text"
          value={search.value}
          oninput={(e) => (search.value = e.target.value)}
        />
      </div>
      <SearchContext.Provider value={search.value}>
        {app?.rootNode && <NodeListItem node={app.rootNode} />}
      </SearchContext.Provider>
    </div>
  )
}
