import {
  useElementBounding,
  useEventListener,
  useMouse,
} from "@kaioken-core/hooks"
import { ElementProps, signal, useCallback, useRef } from "kaioken"

export const FiftyFiftySplitter: Kaioken.FC = (props) => {
  const { mouse } = useMouse()
  const startMouse = signal<{ x: number; y: number } | null>(null)
  const prevOffsetDistance = signal({ x: 0, y: 0 })
  const offsetDistance = signal({ x: 0, y: 0 })
  const firstContainerWidth = signal(0)

  const firstViewContainer = useRef<HTMLElement | null>(null)
  const firstViewContainerBounding = useElementBounding(firstViewContainer)
  const mainContainer = useRef<HTMLElement | null>(null)
  const mainContainerBounding = useElementBounding(mainContainer)

  const firstView = Array.isArray(props.children) ? props.children[0] : <></>
  const secondView = Array.isArray(props.children) ? props.children[1] : <></>

  const onMouseUp = useCallback(() => {
    startMouse.value = null
  }, [])
  useEventListener("mouseup", onMouseUp)

  const onMouseMove = useCallback<
    NonNullable<ElementProps<"div">["onmousemove"]>
  >((e) => {
    if (startMouse.value == null || mainContainer.current == null) return

    const MIN_WIDTH = 250
    offsetDistance.value.x = Math.max(
      Math.min(
        mainContainer.current.clientWidth / 2 - MIN_WIDTH,
        prevOffsetDistance.value.x + startMouse.value.x - e.x
      ),
      (mainContainer.current.clientWidth / 2 - MIN_WIDTH) * -1
    )
    offsetDistance.value.y =
      prevOffsetDistance.value.y + startMouse.value.y - e.y
    offsetDistance.notify()
  }, [])

  useEventListener("mousemove", onMouseMove)

  return (
    <main
      ref={mainContainer}
      className="flex-grow grid gap-2 items-start w-full relative"
      style={{ gridTemplateColumns: `${firstContainerWidth}px 1fr` }}
    >
      <div ref={firstViewContainer} className="firstContainer w-full h-full">
        {firstView}
      </div>
      <div
        className="dividerLine absolute -translate-x-1/2 w-[10px] top-0 bg-red-300 h-full z-[9999]"
        style={{ left: `${firstViewContainerBounding.width}px` }}
        onmousedown={(e) => {
          e.preventDefault()
          startMouse.value = mouse
          prevOffsetDistance.value = { ...offsetDistance.value }
        }}
      />
      <div className="secondContainer h-full">{secondView}</div>
    </main>
  )
}
