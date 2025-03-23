import { useComputed, useEffect, useRef, useSignal } from "kaioken"
import { Canvas, CanvasElementStroke } from "./renderer.canvas"

function setCanvasSize(canvas: HTMLCanvasElement) {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

export function App() {
  const boxes = useSignal<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const resizeHandler = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      setCanvasSize(canvas)
    }
    window.addEventListener("resize", resizeHandler)
    return () => window.removeEventListener("resize", resizeHandler)
  }, [])

  return (
    <div>
      <div className="absolute top-0 left-0 flex gap-2 p-2 bg-white/5">
        <button
          onclick={() => (
            boxes.value.push(crypto.randomUUID()), boxes.notify()
          )}
        >
          Add Box
        </button>
        <button onclick={() => (boxes.value.shift(), boxes.notify())}>
          Remove Box
        </button>
      </div>
      <Canvas.Root
        options={{ showFps: true }}
        oncontextmenu={(e) => e.preventDefault()}
        onMounted={(canvas) => {
          canvasRef.current = canvas
          setCanvasSize(canvas)
        }}
      >
        {boxes.value.map((id) => (
          <Box key={id} />
        ))}
      </Canvas.Root>
    </div>
  )
}

const BOX_WIDTH = 200
const BOX_HEIGHT = 200
const HALF_BOX_WIDTH = BOX_WIDTH / 2
const HALF_BOX_HEIGHT = BOX_HEIGHT / 2
const BOX_SPEED = 2
const randomSpeed = () => (Math.random() < 0.5 ? -BOX_SPEED : BOX_SPEED)
const randomPos = () => ({
  x: Math.max(
    HALF_BOX_WIDTH,
    Math.min(
      window.innerWidth - HALF_BOX_WIDTH,
      Math.random() * window.innerWidth
    )
  ),
  y: Math.max(
    HALF_BOX_HEIGHT,
    Math.min(
      window.innerHeight - HALF_BOX_HEIGHT,
      Math.random() * window.innerHeight
    )
  ),
})
function Box() {
  const controls = useSignal({ mDown: false, mOver: false })
  const vel = useSignal({
    x: randomSpeed(),
    y: randomSpeed(),
  })
  const pos = useSignal(randomPos())
  const radii = useSignal(15)
  const hue = useSignal(Math.random() * 360)
  const hueVel = useSignal(0)
  const color = useComputed(() => `hsl(${hue.value}, 100%, 50%)`)
  const stroke = useComputed<CanvasElementStroke | undefined>(() => {
    const { mDown, mOver } = controls.value
    if (!mDown && !mOver) return undefined
    return {
      color: mDown ? "white" : "#fff6",
      size: mOver ? 3 : 1,
    }
  })

  useEffect(() => {
    let id: number
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      id = window.requestAnimationFrame(tick)
      const { mDown, mOver } = controls.value
      if (mDown) radii.value += 15
      if (mOver) hueVel.value++

      radii.value = Math.min(BOX_HEIGHT / 2, Math.max(15, radii.peek() - 5))
      hue.value = (hue.peek() + hueVel.peek()) % 360
      hueVel.value = Math.max(0, hueVel.peek() - 1)

      pos.value.x += vel.value.x
      pos.value.y += vel.value.y
      if (pos.value.x < HALF_BOX_WIDTH) vel.value.x *= -1
      if (pos.value.x > window.innerWidth - HALF_BOX_WIDTH) vel.value.x *= -1
      if (pos.value.y < HALF_BOX_HEIGHT) vel.value.y *= -1
      if (pos.value.y > window.innerHeight - HALF_BOX_HEIGHT) vel.value.y *= -1
      pos.notify()
    }
    id = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(id)
      cancelled = true
    }
  }, [])

  return (
    <>
      <Canvas.Box
        onMouseDown={() =>
          (controls.value = { ...controls.value, mDown: true })
        }
        onMouseUp={() => (controls.value = { ...controls.value, mDown: false })}
        onMouseOver={() =>
          (controls.value = { ...controls.value, mOver: true })
        }
        onMouseOut={() =>
          (controls.value = { ...controls.value, mOver: false })
        }
        {...{ stroke, color, pos }}
        shape={{ type: "rect", width: BOX_WIDTH, height: BOX_HEIGHT, radii }}
      />
    </>
  )
}
