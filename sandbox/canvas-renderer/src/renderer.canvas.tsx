import {
  createContext,
  createElement,
  ElementProps,
  Signal,
  unwrap,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useVNode,
  type Renderer,
} from "kaioken"

export const Canvas = {
  Root: CanvasRoot,
  Box: CanvasBox,
} as const

type CanvasElementShape =
  | {
      type: "circle"
      radius: Signalable<number>
    }
  | {
      type: "rect"
      width: Signalable<number>
      height: Signalable<number>
      radii?: Signalable<number | undefined>
    }

type Vec2 = {
  x: number
  y: number
}

type Signalable<T> = T | Signal<T>

export type CanvasElementStroke = { size: number; color: string }

type CanvasElement = {
  id: number
  pos: Signalable<Vec2>
  shape: Signalable<CanvasElementShape>
  color: Signalable<string>
  stroke?: Signalable<CanvasElementStroke | undefined>
  onClick?: (e: Event) => void
  onMouseOver?: (e: Event) => void
  onMouseOut?: (e: Event) => void
  onMouseDown?: (e: Event) => void
  onMouseUp?: (e: Event) => void
}
export type CanvasElementProps = Omit<CanvasElement, "id">

type CanvasRendererNodeTypes = {
  parent: CanvasElement
  child: CanvasElement
}

const $CUSTOM_CANVAS_ELEMENT = Symbol.for("customCanvasElement")
const FPS_PADDING_Y = 16
const FPS_PADDING_X = 24

type CanvasRendererOptions = {
  showFps?: boolean
}

type CanvasRootProps = ElementProps<"canvas"> & {
  onMounted?: (canvas: HTMLCanvasElement) => void
  options?: CanvasRendererOptions
}
function CanvasRoot({
  children,
  onMounted,
  options,
  ...props
}: CanvasRootProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => onMounted?.(canvasRef.current!), [])
  return (
    <canvas ref={canvasRef} {...props}>
      <CanvasRenderer canvasRef={canvasRef} options={options}>
        {children}
      </CanvasRenderer>
    </canvas>
  )
}

const CanvasRendererContext = createContext<CanvasRenderer>(null as any)
const useCanvasRenderer = () => useContext(CanvasRendererContext)

const CanvasRenderer: Kaioken.FC<{
  canvasRef: Kaioken.RefObject<HTMLCanvasElement>
  options?: CanvasRendererOptions
}> = ({ children, canvasRef, options }) => {
  const vNode = useVNode()
  vNode.renderer ??= vNode.prev?.renderer ?? createCanvasRenderer()
  useLayoutEffect(() => {
    const renderer = vNode.renderer as CanvasRenderer
    renderer.init(canvasRef.current!, options)
    return () => renderer.dispose()
  }, [children])
  return (
    <CanvasRendererContext.Provider value={vNode.renderer as any}>
      {children}
    </CanvasRendererContext.Provider>
  )
}

function CanvasBox(props: CanvasElementProps) {
  const el = createElement($CUSTOM_CANVAS_ELEMENT as any, { cfg: props })
  el.dom = $CUSTOM_CANVAS_ELEMENT as any
  el.renderer = useCanvasRenderer()
  return el
}

function createThrottled<T extends (...args: any) => void>(
  fn: T,
  delay: number
) {
  let timeout: number | null = null
  let queuedArgs: any
  return ((...args: any) => {
    if (timeout) {
      queuedArgs = args
      return
    }
    fn(...args)
    timeout = window.setTimeout(() => {
      timeout = null
      if (queuedArgs) {
        fn(...queuedArgs)
        queuedArgs = null
      }
    }, delay)
  }) as T
}

type CanvasRenderer = Renderer<CanvasRendererNodeTypes> & {
  init: (canvas: HTMLCanvasElement, options?: CanvasRendererOptions) => void
  dispose: () => void
}

enum MouseDownState {
  None,
  Held,
  Clicked,
}

type CanvasRendererState = {
  options?: CanvasRendererOptions
  canvas: HTMLCanvasElement | null
  ctx: CanvasRenderingContext2D | null
  id: number
  elements: Set<CanvasElement>
}

function createCanvasRenderer(): CanvasRenderer {
  console.log("createCanvasRenderer")
  const state: CanvasRendererState = {
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    id: 0,
    elements: new Set<CanvasElement>(),
  }

  const mouseState = {
    x: 0,
    y: 0,
    down: 0,
    inWindow: false,
  }

  const elementEventStates = new Map<
    CanvasElement,
    {
      isMouseOver: boolean
      isMouseDown: boolean
      onMouseOver?: (e: Event) => void
      onMouseOut?: (e: Event) => void
      onMouseDown?: (e: Event) => void
      onMouseUp?: (e: Event) => void
      onClick?: (e: Event) => void
    }
  >()

  const cleanups: Array<() => void> = []

  const eventLoopTick = () => {
    const { x, y, down, inWindow } = mouseState
    if (!inWindow) return
    elementEventStates.forEach((evtState, el) => {
      let isMouseColliding = false
      const shape = unwrap(el.shape)
      const pos = unwrap(el.pos)
      switch (shape.type) {
        case "circle":
          const rad = unwrap(shape.radius)
          isMouseColliding =
            (x - pos.x) * (x - pos.x) + (y - pos.y) * (y - pos.y) <= rad * rad
          break
        case "rect":
          const width = unwrap(shape.width)
          const height = unwrap(shape.height)
          const halfW = width / 2
          const halfH = height / 2
          isMouseColliding =
            x >= pos.x - halfW &&
            x <= pos.x + halfW &&
            y >= pos.y - halfH &&
            y <= pos.y + halfH
          break
      }

      if (evtState.isMouseOver) {
        if (down === MouseDownState.Clicked) {
          evtState.onClick?.(new MouseEvent("click"))
          evtState.onMouseDown?.(new MouseEvent("mousedown"))
          evtState.isMouseDown = true
        }
        if (!isMouseColliding) {
          evtState.onMouseOut?.(new MouseEvent("mouseout"))
          evtState.isMouseOver = false
        }
      } else if (isMouseColliding) {
        evtState.onMouseOver?.(new MouseEvent("mouseover"))
        evtState.isMouseOver = true
      }
      if (down === MouseDownState.None && evtState.isMouseDown) {
        evtState.onMouseUp?.(new MouseEvent("mouseup"))
        evtState.isMouseDown = false
      }
    })
    if (down === MouseDownState.Clicked) {
      mouseState.down = MouseDownState.Held
    }
  }

  const initMouseEvents = (canvas: HTMLCanvasElement) => {
    const handleBlur = () => {
      mouseState.x = Infinity
      mouseState.y = Infinity
      mouseState.down = 0
      mouseState.inWindow = false
    }
    window.addEventListener("blur", handleBlur)
    cleanups.push(() => window.removeEventListener("blur", handleBlur))

    const handleWindowMouseOut = () => {
      mouseState.inWindow = false
    }
    window.addEventListener("mouseout", handleWindowMouseOut)
    cleanups.push(() =>
      window.removeEventListener("mouseout", handleWindowMouseOut)
    )

    const handleMouseMove = createThrottled((e: MouseEvent) => {
      mouseState.inWindow = true
      mouseState.x = e.clientX
      mouseState.y = e.clientY
      eventLoopTick()
    }, 16)
    canvas.addEventListener("mousemove", handleMouseMove)
    cleanups.push(() =>
      canvas.removeEventListener("mousemove", handleMouseMove)
    )

    const handleMouseDown = createThrottled(() => {
      mouseState.down = MouseDownState.Clicked
      eventLoopTick()
    }, 16)
    canvas.addEventListener("mousedown", handleMouseDown)
    cleanups.push(() =>
      canvas.removeEventListener("mousedown", handleMouseDown)
    )

    const handleMouseUp = createThrottled(() => {
      mouseState.down = MouseDownState.None
      eventLoopTick()
    }, 16)
    canvas.addEventListener("mouseup", handleMouseUp)
    cleanups.push(() => canvas.removeEventListener("mouseup", handleMouseUp))
  }

  let lastTick = -1
  const tickTimes: number[] = []
  function drawFps(c: CanvasRenderingContext2D) {
    const delta = performance.now() - lastTick
    lastTick = performance.now()
    tickTimes.push(delta)
    if (tickTimes.length > 10) tickTimes.shift()
    const avg = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length

    c.save()
    c.font = "12px monospace"
    const txt = `fps: ${Math.round(1000 / avg)}`
    const width = c.measureText(txt).width + FPS_PADDING_X
    const height = 12 + FPS_PADDING_Y

    const x = window.innerWidth - width - 4,
      y = window.innerHeight - height - 4

    c.fillStyle = "#000a"
    c.beginPath()
    c.roundRect(x, y, width, height, 6)
    c.fill()
    c.textBaseline = "top"
    c.fillStyle = "white"
    c.fillText(txt, x + FPS_PADDING_X / 2, y + FPS_PADDING_Y / 2)

    c.restore()
  }

  const render = createThrottled(() => {
    const c = state.ctx
    if (!c) return
    c.clearRect(0, 0, state.canvas!.width || 0, state.canvas!.height || 0)
    state.elements.forEach(
      ({ pos: _pos, shape: _shape, color: _color, stroke: _stroke }) => {
        const pos = unwrap(_pos)
        const shape = unwrap(_shape)
        const color = unwrap(_color)
        const stroke = unwrap(_stroke)
        c.save()
        c.translate(pos.x, pos.y)
        c.beginPath()
        switch (shape.type) {
          case "circle":
            const radius = unwrap(shape.radius)
            c.arc(0, 0, radius, 0, Math.PI * 2)
            break
          case "rect":
            const width = unwrap(shape.width)
            const height = unwrap(shape.height)
            const radii = unwrap(shape.radii)
            c.roundRect(
              -shape.width / 2,
              -shape.height / 2,
              width,
              height,
              radii
            )
            break
        }
        c.fillStyle = color
        c.fill()
        if (stroke) {
          c.strokeStyle = stroke.color
          c.lineWidth = stroke.size
          c.stroke()
        }
        c.closePath()
        c.restore()
      }
    )
    if (state.options?.showFps) drawFps(c)
    eventLoopTick()
  }, 1000 / 60)

  const updateElement: Renderer<CanvasRendererNodeTypes>["updateElement"] = (
    vNode,
    prevProps,
    nextProps
  ) => {
    const keys = new Set([
      ...Object.keys(prevProps.cfg ?? {}),
      ...Object.keys(nextProps.cfg ?? {}),
    ])
    const el = vNode.dom as any as CanvasElement
    keys.forEach((key) => {
      if (!key.startsWith("on")) {
        if (Signal.isSignal(nextProps.cfg[key])) {
          nextProps.cfg[key].subscribe(render)
        }
        return
      }
      let evts = elementEventStates.get(el)
      if (!evts) {
        evts = {
          isMouseOver: false,
          isMouseDown: false,
        }
        elementEventStates.set(el, evts)
      }

      const prevHandler = prevProps.cfg?.[key]
      const nextHandler = nextProps.cfg[key]
      if (prevHandler !== nextHandler) {
        ;(evts as any)[key] = nextHandler
      }
    })
    // const existingEl = state.elements.(
    //   (e) => e.id === (vNode.dom as any as CanvasElement).id
    // )
    Object.assign(vNode.dom as any, nextProps.cfg)
    render()
  }

  return {
    init(canvas, options) {
      state.canvas = canvas
      state.ctx = canvas.getContext("2d")
      state.options = options
      initMouseEvents(canvas)
      render()
    },
    dispose() {
      cleanups.forEach((fn) => fn())
    },
    appendChild(_, element) {
      state.elements.add(element)
      render()
    },
    prependChild(_, element) {
      state.elements.add(element)
      render()
    },
    onRemove(vNode) {
      state.elements.delete(vNode.dom as any as CanvasElement)
      elementEventStates.delete(vNode.dom as any as CanvasElement)
      render()
    },
    insertAfter(_, __, element) {
      state.elements.add(element)
      render()
    },
    isParentEmpty() {
      return state.elements.size === 0
    },
    shouldSearchChildrenForSibling() {
      return true
    },
    canBeCommitted() {
      return true
    },
    createRoot() {
      return null as any
    },
    elementRequiresPlacement() {
      return true
    },
    onRootMounted() {},
    createElement(vNode) {
      return { ...vNode.props.cfg, id: ++state.id, renderer: this }
    },
    getMountableParent() {
      return null as any
    },
    isValidParent() {
      return true
    },
    canInsertAfter() {
      return true
    },
    updateElement,
    validateProps() {},
    onBeforeCommit: () => {},
    onAfterCommit: () => {},
    onCommitTraversalDescend: () => {},
    onUpdateTraversalAscend: () => {},
  }
}
