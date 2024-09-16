import * as kaioken from "kaioken"
import { twMerge } from "tailwind-merge"
import { Flame } from "./icon/Flame"
import { useAnchorPos } from "./hooks/useAnchorPos"
import { useEffectDeep, useSpring } from "@kaioken-core/hooks"
import { signal, Transition, useEffect, useLayoutEffect, useRef } from "kaioken"
import { useDevTools } from "./hooks/useDevtools"
import { InspectComponent } from "./components/InspectComponent"
import { PageInfo } from "./icon/PageInfo"
import { SquareMouse } from "./icon/SquareMouse"
import { toggleElementToVnode } from "./store"

export default function App() {
  const toggled = signal(false)
  const handleOpen = useDevTools()
  const {
    anchorCoords,
    anchorRef,
    viewPortRef,
    startMouse,
    elementBound,
    snapSide,
    updateAnchorPos,
  } = useAnchorPos()
  const isHorizontalSnap =
    snapSide.value === "left" || snapSide.value === "right"
  const isMounted = useRef(false)

  const [springBtnCoords, setSpringBtnCoords] = useSpring(anchorCoords.value, {
    damping: 0.4,
  })

  useLayoutEffect(() => {
    if (isMounted.current === false) {
      setSpringBtnCoords(anchorCoords.value, {
        hard: true,
      })
    }

    isMounted.current = true
  }, [Math.round(elementBound.width), Math.round(elementBound.height)])

  useEffectDeep(() => {
    setSpringBtnCoords(anchorCoords.value)
  }, [anchorCoords.value])

  useEffect(() => {
    if (toggled.value) {
      updateAnchorPos()
    }
  }, [toggled.value, updateAnchorPos])

  const handleToggleInspect = () => {
    window.__kaioken?.emit(
      // @ts-expect-error We have our own custom type here
      "devtools:toggleInspect",
      { value: !toggleElementToVnode.value }
    )
  }

  return (
    <>
      <div
        ref={viewPortRef}
        className="w-full h-0 fixed top-0 left-0 z-[-9999] overflow-scroll pointer-events-none"
      />
      <div
        ref={anchorRef}
        className={`flex ${isHorizontalSnap ? "flex-col" : ""} ${toggled.value ? "rounded-3xl" : "rounded-full"} p-1 gap-1 items-center will-change-transform bg-crimson`}
        style={{
          transform: `translate3d(${Math.round(springBtnCoords.x)}px, ${Math.round(springBtnCoords.y)}px, 0)`,
        }}
      >
        <Transition
          in={toggled.value}
          duration={{
            in: 40,
            out: 150,
          }}
          element={(state) => {
            if (state === "exited") return null
            const scale = state === "entered" ? "1" : "0.5"
            const opacity = state === "entered" ? "1" : "0"
            return (
              <>
                <button
                  title="Open Devtools"
                  onclick={() => handleOpen()}
                  style={{ transform: `scale(${scale})`, opacity }}
                  className="transition text-white rounded-full p-1 hover:bg-[#0003]"
                >
                  <PageInfo width={16} height={16} />
                </button>
                <button
                  title="Toggle Component Inspection"
                  onclick={handleToggleInspect}
                  style={{ transform: `scale(${scale})`, opacity }}
                  className={`transition text-white rounded-full p-1 hover:bg-[#0003] ${toggleElementToVnode.value ? "bg-[#0003]" : ""}`}
                >
                  <SquareMouse width={16} height={16} />
                </button>
              </>
            )
          }}
        />
        <button
          className={twMerge(
            "bg-crimson rounded-full p-1",
            startMouse.value && "pointer-events-none"
          )}
          onclick={() => {
            toggled.value = !toggled.value
          }}
          tabIndex={-1}
        >
          <Flame />
        </button>
      </div>
      <div hidden>
        {/* <SelectedNodeView
          kaiokenGlobal={window.__kaioken}
          selectedApp={useDevTools().selectedApp}
        /> */}
      </div>
      <InspectComponent />
    </>
  )
}
