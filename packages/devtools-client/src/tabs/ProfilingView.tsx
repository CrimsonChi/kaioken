import { AppContext, useEffect, useRequestUpdate } from "kaioken"
import { kaiokenGlobal } from "../store"
import { isDevtoolsApp } from "devtools-shared"

function typedMapEntries<T extends Map<any, any>>(
  map: T
): InferredMapEntries<T> {
  return Array.from(map.entries()) as InferredMapEntries<T>
}

type InferredMapEntries<T> = T extends Map<infer K, infer V> ? [K, V][] : never

export function ProfilingView() {
  const requestUpdate = useRequestUpdate()
  useEffect(() => {
    const update = (app: AppContext) => {
      if (isDevtoolsApp(app)) return
      requestUpdate()
    }
    kaiokenGlobal?.on("mount", update)
    kaiokenGlobal?.on("unmount", update)
    return () => {
      kaiokenGlobal?.off("mount", update)
      kaiokenGlobal?.off("unmount", update)
    }
  }, [])

  const profilingContext = kaiokenGlobal?.profilingContext!
  return (
    <div className="flex flex-col gap-2">
      {typedMapEntries(profilingContext.appStats)
        .filter(([app]) => !isDevtoolsApp(app))
        .map(([app]) => (
          <AppProfilingView key={app.id} app={app} />
        ))}
    </div>
  )
}

type AppProfilingViewProps = {
  app: AppContext
}
function AppProfilingView({ app }: AppProfilingViewProps) {
  const requestUpdate = useRequestUpdate()
  useEffect(() => {
    const onUpdate = (_app: AppContext) => {
      if (_app.id !== app.id) return
      requestUpdate()
    }
    kaiokenGlobal?.on("update", onUpdate)
    return () => kaiokenGlobal?.off("update", onUpdate)
  }, [])
  const profilingContext = kaiokenGlobal?.profilingContext!

  return (
    <div className="flex flex-col gap-2 border border-white border-opacity-10 rounded bg-neutral-400 bg-opacity-5 text-neutral-400 p-2">
      <div className="flex gap-2 justify-between">
        <span>{app.name}</span>
        <div
          className="text-sm grid grid-cols-2 gap-x-4"
          style="grid-template-columns: auto auto;"
        >
          <span className="text-right">Mount duration:</span>
          {profilingContext.mountDuration(app).toFixed(2)} ms
          <span className="text-right">Total updates:</span>
          <span>{profilingContext.totalTicks(app).toLocaleString()}</span>
          <span className="text-right">Avg. update duration:</span>
          {profilingContext.averageTickDuration(app).toFixed(2)} ms
          <span className="text-right">Latest update:</span>
          <span>{profilingContext.lastTickDuration(app).toFixed(2)} ms</span>
        </div>
      </div>
    </div>
  )
}
