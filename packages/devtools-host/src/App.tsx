import { useRef, signal, useMemo, useCallback, useEffect, useLayoutEffect } from "kaioken"
import { useDevtoolsStore } from "./store"
import { useEffectDeep, useElementBounding, useEventListener, useMouse, useSpring } from "@kaioken-core/hooks"
import { twMerge } from 'tailwind-merge'
import { Flame } from "./icon/Flame"

const PADDING = 16
type SnapSide = "bottom" | "top" | "right" | "left"
const LOCAL_KEY = "kaioken.devtools.anchorPosition"

export default function App() {
  const {
    value: { popupWindow },
    setPopupWindow,
  } = useDevtoolsStore()
	const { mouse } = useMouse()
  const startMouse = signal<null | { x: number, y: number }>(null)
  const btnRef=  useRef<null | HTMLElement>(null)
  const viewPortRef = useRef<null | HTMLElement>(null)
  const elementBound = useElementBounding(btnRef)
  const lastDroppedCoord = signal({ x: -PADDING, y: -PADDING })
  const btnCoords = signal({ x: -PADDING, y: -PADDING })
  const viewportSize = signal({ width: window.innerWidth, height: window.innerHeight })
  const snapSide = signal<SnapSide>('bottom')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useLayoutEffect(() => {
    const resultString = localStorage.getItem(LOCAL_KEY)
    if (resultString == null || viewPortRef.current == null) return

    const result: {
      x: number,
      y: number,
      width: number,
      height: number,
      snapSide: SnapSide
    } = JSON.parse(resultString)

    const rateInWidthChange = (window.innerWidth / result.width)
    const rateInHeightChange = window.innerHeight / result.height

    let forceX: number | null = null
    let forceY: number | null = null
    if (result.snapSide === 'left') {
      forceX = (viewPortRef.current.offsetWidth - elementBound.width) * -1 + PADDING
    } else if (result.snapSide === 'right') {
      forceX = -PADDING
    } else if (result.snapSide === 'bottom') {
      forceY = -PADDING
    } else if (result.snapSide === 'top') {
      forceY = (window.innerHeight - (elementBound.height)) * -1 + PADDING
    }

    btnCoords.value = { x: forceX ?? (result.x * rateInWidthChange), y: forceY ?? (result.y * rateInHeightChange) }

    setTweenBtnCoords(btnCoords.value, {
      hard: true
    })
    viewportSize.value.width = window.innerWidth
    viewportSize.value.height = window.innerHeight
    snapSide.value = result.snapSide
  }, [Math.round(elementBound.width)])

  const [tweenBtnCoords, setTweenBtnCoords] = useSpring(btnCoords.value, {
    damping: 0.4,
  })

  useEffect(() => {
    setTweenBtnCoords(btnCoords.value)
  }, Object.values(btnCoords.value))

  const distanceCovered = useMemo(() => {
    if (startMouse.value === null) return null

    return {
      x: mouse.x - startMouse.value.x,
      y: mouse.y - startMouse.value.y,
    }
  }, [startMouse.value, mouse])
  
  useEventListener('mouseup', () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (startMouse.value) {
      startMouse.value = null
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        ...btnCoords.value,
        ...viewportSize.value,
        snapSide: snapSide.value,
      }))
    }
	})

  useEffectDeep(() => {
    if (distanceCovered === null || !viewPortRef.current) return 

    const viewportWidth = viewPortRef.current.offsetWidth
    const isInBottomSeg = mouse.y >= window.innerHeight - 100
    const isInTopSeg = mouse.y <= 100 
    const isInMidSeg = !isInTopSeg && !isInBottomSeg

    if (isInMidSeg) {
      const isRight = mouse.x > window.innerWidth / 2
      snapSide.value = isRight ? 'right' : 'left'
    } else {
      snapSide.value = isInTopSeg ? 'top' : 'bottom'
    }

    if (snapSide.value === 'right') {
      const min = Math.min(-PADDING, lastDroppedCoord.value.y + distanceCovered.y)
      btnCoords.value = { x: -PADDING, y: Math.max(min, (window.innerHeight - (elementBound.height)) * -1 + PADDING) }
      return;
    } else if (snapSide.value === 'left') {
      const min = Math.min(0, lastDroppedCoord.value.y + distanceCovered.y)
      btnCoords.value = { x: (viewportWidth - elementBound.width) * -1 + PADDING, y: Math.max(min, (window.innerHeight - (elementBound.height)) * -1 + PADDING) }

      return;
    } else if (snapSide.value === 'top') {
      const min = Math.min(-PADDING, lastDroppedCoord.value.x + distanceCovered.x)
      btnCoords.value = {
        x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING),
        y: (window.innerHeight - (elementBound.height)) * -1 + PADDING
      }

      return
    }

    const min = Math.min(-PADDING, lastDroppedCoord.value.x + distanceCovered.x)
    btnCoords.value = { y: -PADDING, x: Math.max(min, (viewportWidth - elementBound.width) * -1 + PADDING) }
  }, [distanceCovered])

  const onResize = useCallback(() => {
    if (viewPortRef.current === null) return

    const rateInWidthChange = (window.innerWidth / viewportSize.value.width)
    const rateInHeightChange = window.innerHeight / viewportSize.value.height

    let forceX: number | null = null
    let forceY: number | null = null
    if (snapSide.value === 'left') {
      forceX = (viewPortRef.current.offsetWidth - elementBound.width) * -1 + PADDING
    } else if (snapSide.value === 'right') {
      forceX = -PADDING
    } else if (snapSide.value === 'bottom') {
      forceY = -PADDING
    } else if (snapSide.value === 'top') {
      forceY = (window.innerHeight - (elementBound.height)) * -1 + PADDING
    }

    btnCoords.value = { x: forceX ?? (btnCoords.value.x * rateInWidthChange), y: forceY ?? (btnCoords.value.y * rateInHeightChange) }
    viewportSize.value.width = window.innerWidth
    viewportSize.value.height = window.innerHeight

    localStorage.setItem(LOCAL_KEY, JSON.stringify({
      ...btnCoords.value,
      ...viewportSize.value,
      snapSide: snapSide.value,
    }))
  }, [Math.round(elementBound.height)])
  useEventListener('resize', onResize)

  function handleOpen() {
    if (popupWindow) return popupWindow.focus()
    const features = `popup,width=${Math.floor(window.screen.width / 2)},height=${Math.floor(window.screen.height / 2)};`
    const w = window.open("/__devtools__", "_blank", features)
    if (!w) return console.error("[kaioken]: Unable to open devtools window")

    w.onload = () => {
      setPopupWindow(w)
      console.debug("[kaioken]: devtools window opened")
      w.onbeforeunload = () => {
        console.debug("[kaioken]: devtools window closed")
        setPopupWindow(null)
      }
    }
  }

  return (
    <>
      <div 
        ref={viewPortRef} 
        className={
          twMerge(
            "w-full h-0 fixed top-0 left-0 z-[-9999] overflow-scroll pointer-events-none",
            startMouse.value && 'pointer-events-none'
          )
        }
      />
      <button
        className="bg-crimson rounded-[50%] p-1 will-change-transform"
        onclick={handleOpen}
        tabIndex={-1}
        ref={btnRef}
        onmousedown={(e) => {
          e.preventDefault()

          timeoutRef.current = setTimeout(() => {
            startMouse.value = { x: e.x, y: e.y }
            lastDroppedCoord.value = btnCoords.value
          }, 100)
        }}
        style={{ transform: `translate3d(${Math.round(tweenBtnCoords.x)}px, ${Math.round(tweenBtnCoords.y)}px, 0)` }}
      >
        <Flame />
      </button>
    </>
  )
}
