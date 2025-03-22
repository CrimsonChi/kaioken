import { useComputed, useEffect, useRef, useSignal } from "kaioken"
import { Canvas, CanvasElementStroke } from "./renderer.canvas"
import { getCurrentVNode } from "kaioken/utils"

function setCanvasSize(canvas: HTMLCanvasElement) {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

const BOX_WIDTH = 200
const BOX_HEIGHT = 200
const HALF_BOX_WIDTH = BOX_WIDTH / 2
const HALF_BOX_HEIGHT = BOX_HEIGHT / 2

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isMouseDown = useSignal(false)
  const isMouseOver = useSignal(false)
  const vel = useSignal({ x: 2, y: 2 })
  const pos = useSignal({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
  const hue = useSignal(50)
  const color = useComputed(() => `hsl(${hue.value}, 100%, 50%)`)
  const stroke = useComputed<CanvasElementStroke | undefined>(() => {
    const mDown = isMouseDown.value,
      mOver = isMouseOver.value
    if (!mDown && !mOver) return undefined
    return {
      color: mDown ? "#f00" : "#00f",
      size: mOver ? 3 : 1,
    }
  })
  useEffect(() => {
    let id: number
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      id = window.requestAnimationFrame(tick)
      if (getCurrentVNode()) return // prevent conflicts with kaioken's event loop

      pos.value.x += vel.value.x
      pos.value.y += vel.value.y
      if (pos.value.x < HALF_BOX_WIDTH) vel.value.x *= -1
      if (pos.value.x > window.innerWidth - HALF_BOX_WIDTH) vel.value.x *= -1
      if (pos.value.y < HALF_BOX_HEIGHT) vel.value.y *= -1
      if (pos.value.y > window.innerHeight - HALF_BOX_HEIGHT) vel.value.y *= -1
      pos.notify()

      hue.value = (hue.peek() + 1) % 360
    }
    id = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(id)
      cancelled = true
    }
  }, [])

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
      <Canvas.Root
        options={{ showFps: true }}
        oncontextmenu={(e) => e.preventDefault()}
        onMounted={(canvas) => {
          canvasRef.current = canvas
          setCanvasSize(canvas)
        }}
      >
        {/* <Box /> */}
        <Canvas.Box
          onClick={(e) => console.log(e)}
          onMouseDown={() => (isMouseDown.value = true)}
          onMouseUp={() => (isMouseDown.value = false)}
          onMouseOver={() => (isMouseOver.value = true)}
          onMouseOut={() => (isMouseOver.value = false)}
          {...{ stroke, color, pos }}
          shape={{ type: "rect", width: BOX_WIDTH, height: BOX_HEIGHT }}
          //shape={{ type: "circle", radius: BOX_HEIGHT / 2 }}
        />
      </Canvas.Root>
    </div>
  )
}

// function Box() {
//   const pos = useSignal({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
//   const vel = useSignal({ x: 2, y: 2 })
//   const stroke = useSignal<CanvasElementStroke | undefined>(undefined)
//   const hue = useSignal(50)
//   useEffect(() => {
//     let id: number
//     let cancelled = false
//     const tick = () => {
//       if (cancelled) return
//       id = window.requestAnimationFrame(tick)

//       pos.value.x += vel.value.x
//       pos.value.y += vel.value.y
//       if (pos.value.x < HALF_BOX_WIDTH) vel.value.x *= -1
//       if (pos.value.x > window.innerWidth - HALF_BOX_WIDTH) vel.value.x *= -1
//       if (pos.value.y < HALF_BOX_HEIGHT) vel.value.y *= -1
//       if (pos.value.y > window.innerHeight - HALF_BOX_HEIGHT) vel.value.y *= -1
//       pos.notify()

//       hue.value = (hue.peek() + 1) % 360
//     }
//     id = window.requestAnimationFrame(tick)

//     return () => {
//       window.cancelAnimationFrame(id)
//       cancelled = true
//     }
//   }, [])

//   return (
//     <Canvas.Box
//       onClick={(e) => console.log(e)}
//       onMouseDown={() => {
//         stroke.value = {
//           color: "white",
//           size: 5,
//         }
//       }}
//       onMouseUp={() => {
//         stroke.value = undefined
//       }}
//       onMouseOver={() => {
//         stroke.value = {
//           color: "red",
//           size: 5,
//         }
//       }}
//       onMouseOut={() => {
//         stroke.value = undefined
//       }}
//       stroke={stroke.value}
//       color={`hsl(${hue}, 100%, 50%)`}
//       pos={pos.value}
//       shape={{ type: "rect", width: BOX_WIDTH, height: BOX_HEIGHT }}
//       //shape={{ type: "circle", radius: BOX_HEIGHT / 2 }}
//     />
//   )
// }
