import { AppContext, useEffect, useRequestUpdate, useState } from "kaioken"
import { SWRCache, SWRCacheEntry } from "kaioken/swr"
import { kaiokenGlobal } from "../store"
import { ChevronIcon, isDevtoolsApp, typedMapEntries } from "devtools-shared"
import { ValueEditor } from "devtools-shared/src/ValueEditor"

export function SWRTabView() {
  const requestUpdate = useRequestUpdate()
  useEffect(() => {
    const onUpdate = (_app: AppContext) => {
      if (isDevtoolsApp(_app)) return
      requestUpdate()
    }
    kaiokenGlobal?.on("update", onUpdate)
    return () => kaiokenGlobal?.off("update", onUpdate)
  }, [])

  const SWR_GLOBAL_CACHE: SWRCache =
    kaiokenGlobal?.globalState[Symbol.for("SWR_GLOBAL")] ?? new Map()

  if (SWR_GLOBAL_CACHE.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-lg italic text-neutral-400">No SWR detected</h2>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {typedMapEntries(SWR_GLOBAL_CACHE).map(([key, entry]) => (
        <SWRCacheEntryView key={key} entry={entry} />
      ))}
    </div>
  )
}

type SWRCacheEntryViewProps = {
  key: string
  entry: SWRCacheEntry<any>
}

function SWRCacheEntryView({ key, entry }: SWRCacheEntryViewProps) {
  const [expanded, setExpanded] = useState(false)
  const requestUpdate = useRequestUpdate()
  useEffect(() => {
    const { resource, isValidating, isMutating } = entry
    const subs = [
      resource.subscribe(requestUpdate),
      isValidating.subscribe(requestUpdate),
      isMutating.subscribe(requestUpdate),
    ]
    return () => subs.forEach((sub) => sub())
  }, [])
  return (
    <div className="flex flex-col">
      <div
        onclick={() => setExpanded(!expanded)}
        className={
          "flex items-center gap-2 justify-between p-2 border border-white border-opacity-10 cursor-pointer" +
          (expanded
            ? " bg-white bg-opacity-5 text-neutral-100 rounded-t"
            : " hover:bg-white hover:bg-opacity-10 text-neutral-400 rounded")
        }
      >
        {key}
        <ChevronIcon
          className={`transition-all` + (expanded ? " rotate-90" : "")}
        />
      </div>
      {expanded && (
        <ValueEditor
          data={{
            resource: entry.resource.peek(),
            isMutating: entry.isMutating.peek(),
            isValidating: entry.isValidating.peek(),
          }}
          border={false}
          mutable={false}
          objectRefAcc={[]}
          keys={[]}
          onChange={() => {}}
          className="border border-white border-opacity-10 rounded-b"
        />
      )}
    </div>
  )
}
