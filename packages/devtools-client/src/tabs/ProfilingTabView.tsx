import {
  AppContext,
  useEffect,
  useRef,
  useRequestUpdate,
  useSignal,
} from "kaioken"
import { kaiokenGlobal } from "../state"
import { isDevtoolsApp, typedMapEntries } from "devtools-shared"
import { LineChart, LineChartData } from "../components/LineChart"

export function ProfilingTabView() {
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

const MAX_TICKS = 100

const createLineChartDatasets = (
  updates: number[],
  updateDirtied: number[],
  createNode: number[],
  updateNode: number[],
  removeNode: number[]
): LineChartData["datasets"] => {
  return [
    {
      label: "update",
      data: updates,
      fill: false,
      borderColor: "#ad981f",
      tension: 0.1,
      pointStyle: false,
    },
    {
      label: "updateDirtied",
      data: updateDirtied,
      fill: false,
      borderColor: "#b21f3a",
      tension: 0.1,
      pointStyle: false,
    },
    {
      label: "createNode",
      data: createNode,
      fill: false,
      borderColor: "#198019",
      tension: 0.1,
      pointStyle: false,
    },
    {
      label: "removeNode",
      data: removeNode,
      fill: false,
      borderColor: "#5F3691",
      tension: 0.1,
      pointStyle: false,
    },
    {
      label: "updateNode",
      data: updateNode,
      fill: false,
      borderColor: "#2f2f9d",
      tension: 0.1,
      pointStyle: false,
    },
  ]
}

const initialLineChartDatasets = createLineChartDatasets(
  [0],
  [0],
  [0],
  [0],
  [0]
)

type AppProfilingViewProps = {
  app: AppContext
}
function AppProfilingView({ app }: AppProfilingViewProps) {
  const requestUpdate = useRequestUpdate()
  const updateEvents = useRef<number[]>([0])
  const updateDirtiedEvents = useRef<number[]>([0])
  const createNodeEvents = useRef<number[]>([0])
  const removeNodeEvents = useRef<number[]>([0])
  const diffNodeEvents = useRef<number[]>([0])
  const lineChartData = useSignal<LineChartData>({
    labels: [(performance.now() / 1000).toFixed(2)],
    datasets: initialLineChartDatasets,
  })
  const chartHovered = useSignal(false)
  const profilingContext = kaiokenGlobal?.profilingContext!

  useEffect(() => {
    const onUpdate = (_app: AppContext) => {
      if (_app.id !== app.id) return
      requestUpdate()
    }
    kaiokenGlobal?.on("update", onUpdate)
    return () => kaiokenGlobal?.off("update", onUpdate)
  }, [])

  useEffect(() => {
    const onUpdate = (_app: AppContext) => {
      if (_app.id !== app.id) return
      const arr = updateEvents.current
      arr[arr.length - 1]++
    }
    const onUpdateDirtied = (_app: AppContext) => {
      if (_app.id !== app.id) return
      const arr = updateDirtiedEvents.current
      arr[arr.length - 1]++
    }
    const onCreateNode = (_app: AppContext) => {
      if (_app.id !== app.id) return
      const arr = createNodeEvents.current
      arr[arr.length - 1]++
    }
    const onUpdateNode = (_app: AppContext) => {
      if (_app.id !== app.id) return
      const arr = diffNodeEvents.current
      arr[arr.length - 1]++
    }
    const onRemoveNode = (_app: AppContext) => {
      if (_app.id !== app.id) return
      const arr = removeNodeEvents.current
      arr[arr.length - 1]++
    }
    profilingContext.addEventListener("update", onUpdate)
    profilingContext.addEventListener("updateDirtied", onUpdateDirtied)
    profilingContext.addEventListener("createNode", onCreateNode)
    profilingContext.addEventListener("updateNode", onUpdateNode)
    profilingContext.addEventListener("removeNode", onRemoveNode)

    const updateInterval = setInterval(() => {
      const newLabels = [...lineChartData.value.labels]
      ;[
        updateEvents.current,
        updateDirtiedEvents.current,
        createNodeEvents.current,
        diffNodeEvents.current,
        removeNodeEvents.current,
      ].forEach((arr) => {
        arr.push(0)
        if (arr.length > MAX_TICKS) {
          arr.shift()
        }
      })
      newLabels.push((performance.now() / 1000).toFixed(2))
      if (newLabels.length > MAX_TICKS) {
        newLabels.shift()
      }
      if (chartHovered.peek() === true) return
      lineChartData.value = {
        labels: newLabels,
        datasets: createLineChartDatasets(
          updateEvents.current,
          updateDirtiedEvents.current,
          createNodeEvents.current,
          diffNodeEvents.current,
          removeNodeEvents.current
        ),
      }
    }, 100)

    return () => {
      profilingContext.removeEventListener("update", onUpdate)
      profilingContext.removeEventListener("updateDirtied", onUpdateDirtied)
      profilingContext.removeEventListener("createNode", onCreateNode)
      profilingContext.removeEventListener("updateNode", onUpdateNode)
      clearInterval(updateInterval)
    }
  }, [])

  return (
    <div className="flex flex-col gap-2 border border-white border-opacity-10 rounded bg-neutral-400 bg-opacity-5 text-neutral-400 p-2">
      <div
        className="grid items-start"
        style="grid-template-columns: 1fr max-content;"
      >
        <div className="flex flex-col gap-2">
          <span>{app.name}</span>
          <LineChart
            data={lineChartData}
            className="w-full max-w-full min-h-20 bg-black bg-opacity-30"
            onmouseenter={() => (chartHovered.value = true)}
            onmouseleave={() => (chartHovered.value = false)}
          />
        </div>
        <div
          className="text-xs grid grid-cols-2 gap-x-4"
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
