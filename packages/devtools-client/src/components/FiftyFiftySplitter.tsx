import {
  useElementBounding,
  useEventListener,
  useMouse,
} from "@kaioken-core/hooks"
import {
  ElementProps,
  signal,
  useCallback,
  useLayoutEffect,
  useRef,
} from "kaioken"

export const FiftyFiftySplitter = (props: {
  children: [JSX.Element, JSX.Element]
}) => {
  const { mouse } = useMouse()
  const startMouse = signal<{ x: number; y: number } | null>(null)
  const prevFirstContainerWidth = signal(0)
  const firstContainerWidth = signal(0)

  const firstViewContainer = useRef<HTMLDivElement>(null)
  const firstViewContainerBounding = useElementBounding(firstViewContainer)
  const mainContainer = useRef<HTMLDivElement>(null)

  const firstView = Array.isArray(props.children) ? props.children[0] : <></>
  const secondView = Array.isArray(props.children) ? props.children[1] : <></>

  useLayoutEffect(() => {
    if (!mainContainer.current) return
    firstContainerWidth.value = mainContainer.current.clientWidth / 2
  }, [mainContainer.current])

  const onMouseUp = useCallback(() => {
    startMouse.value = null
  }, [])
  useEventListener("mouseup", onMouseUp)

  const onMouseMove = useCallback<
    NonNullable<ElementProps<"div">["onmousemove"]>
  >((e) => {
    if (startMouse.value == null || mainContainer.current == null) return

    const max = Math.max(
      prevFirstContainerWidth.value + e.x - startMouse.value.x,
      250
    )
    firstContainerWidth.value = Math.min(
      max,
      mainContainer.current.clientWidth - 250
    )
  }, [])
  useEventListener("mousemove", onMouseMove)

  const onResize = useCallback(() => {
    if (mainContainer.current == null) return

    if (mainContainer.current.clientWidth - 250 < firstContainerWidth.value) {
      firstContainerWidth.value = Math.max(
        mainContainer.current.clientWidth - 250,
        250
      )
    }
  }, [])
  useEventListener("resize", onResize)

  return (
    <main
      ref={mainContainer}
      className="flex-grow grid gap-2 items-start w-full relative"
      style={{ gridTemplateColumns: `${firstContainerWidth}px 1fr` }}
    >
      <div ref={firstViewContainer} className="firstContainer w-full h-full">
        {firstView}
      </div>
      {firstViewContainerBounding.width != 0 && (
        <div
          className="w-8 flex justify-center h-full absolute top-0 -translate-x-1/2 cursor-col-resize z-[9999]"
          style={{ left: `${firstViewContainerBounding.width}px` }}
          onmousedown={(e) => {
            e.preventDefault()
            startMouse.value = mouse
            prevFirstContainerWidth.value = firstContainerWidth.value
          }}
        >
          <div className="dividerLine w-[5px] bg-neutral-800 h-full" />
        </div>
      )}
      <div className="secondContainer h-full">{secondView}</div>
    </main>
  )
}
