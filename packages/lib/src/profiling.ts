import type { AppContext } from "./appContext"

const MAX_TICKS = 100

type TickTS = {
  start: number
  end: number
}
export function createProfilingContext() {
  const appStats: Map<
    AppContext,
    {
      timestamps: TickTS[]
      mountDuration: number
      totalTicks: number
    }
  > = new Map()
  return {
    appStats,
    mountDuration: (app: AppContext) => {
      const stats = appStats.get(app)
      if (!stats) return 0
      return stats.mountDuration
    },
    totalTicks: (app: AppContext) => {
      const stats = appStats.get(app)
      if (!stats) return 0
      return stats.totalTicks
    },
    lastTickDuration: (app: AppContext) => {
      const stats = appStats.get(app)
      if (!stats) return 0
      const last = stats.timestamps[stats.timestamps.length - 1]
      return last.end - last.start
    },
    averageTickDuration: (app: AppContext) => {
      const stats = appStats.get(app)
      if (!stats) return 0
      const completeTicks = stats.timestamps.filter((ts) => ts.end !== Infinity)
      return (
        completeTicks.reduce((a, b) => a + (b.end - b.start), 0) /
        completeTicks.length
      )
    },
    start: (app: AppContext) => {
      if (!appStats.has(app)) {
        appStats.set(app, {
          mountDuration: Infinity,
          timestamps: [],
          totalTicks: 0,
        })
      }
      const stats = appStats.get(app)!
      stats.totalTicks++
      stats.timestamps.push({ start: performance.now(), end: Infinity })
    },
    stop: (app: AppContext) => {
      if (!appStats.has(app)) return
      const stats = appStats.get(app)!

      const last = stats.timestamps[stats.timestamps.length - 1]
      last.end = performance.now()

      if (stats.mountDuration === Infinity) {
        stats.mountDuration = last.end - last.start
      }
      if (stats.timestamps.length > MAX_TICKS) stats.timestamps.shift()
    },
  }
}
