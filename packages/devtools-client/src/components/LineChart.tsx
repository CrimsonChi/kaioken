import {
  Chart,
  type PointStyle,
  LinearScale,
  LineController,
  CategoryScale,
  PointElement,
  LineElement,
} from "chart.js"
import zoomPlugin from "chartjs-plugin-zoom"

import { type ElementProps, type Signal, useEffect, useRef } from "kaioken"

export type LineChartData = {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    fill: boolean
    borderColor: string
    tension: number
    pointStyle?: PointStyle
  }[]
}

export type LineChartProps = Omit<ElementProps<"canvas">, "ref"> & {
  data: Signal<LineChartData>
}

export function LineChart({ data, ...props }: LineChartProps) {
  const chartInstance = useRef<Chart | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    Chart.register(
      zoomPlugin,
      LinearScale,
      LineController,
      CategoryScale,
      PointElement,
      LineElement
    )
    const canvas = canvasRef.current!
    const chart = (chartInstance.current = new Chart(canvas, {
      type: "line",
      data: data.peek(),
      options: {
        scales: {
          y: {
            min: 0,
          },
        },
        animation: false,
        responsive: true,
        plugins: {
          zoom: {
            pan: {
              enabled: true,
              mode: "x",
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              mode: "x",
            },
          },
          legend: {
            position: "top",
          },
          title: {
            display: false,
          },
        },
      },
    }))

    const unsub = data.subscribe((newData) => {
      for (const dataset of newData.datasets) {
        const existing = chart.data.datasets.find(
          (d) => d.label === dataset.label
        )
        if (existing) {
          existing.data.splice(0, existing.data.length)
          existing.data.push(...dataset.data)
        }
      }
      chart.data.labels!.splice(0, chart.data.labels!.length)
      chart.data.labels!.push(...newData.labels)
      chart.update()
    })

    return () => {
      chart.destroy()
      unsub()
    }
  }, [])
  return <canvas ref={canvasRef} {...props} />
}
