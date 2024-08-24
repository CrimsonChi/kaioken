import { twMerge } from "tailwind-merge"
import { Flame } from "./icon/Flame"
import { useBtnPos } from "./hooks/useBtnPos"
import { useEffectDeep, useSpring } from "@kaioken-core/hooks"
import { signal, Transition, useLayoutEffect, useRef } from "kaioken"
import { useDevTools } from "./hooks/useDevtools"
import { InspectComponent } from "./components/InspectComponent"
import { PageInfo } from "./icon/PageInfo"
import { SquareMouse } from "./icon/SquareMouse"
import { toggleElementToVnode } from "./store"

export default function App() {
  const toggled = signal(false)
  const handleOpen = useDevTools()
  const btnContainerRef = useRef<HTMLElement | null>(null)
  const { btnCoords, btnRef, viewPortRef, startMouse, elementBound, snapSide } =
    useBtnPos()
  const isHorizontalSnap =
    snapSide.value === "left" || snapSide.value === "right"

  const [springBtnCoords, setSpringBtnCoords] = useSpring(btnCoords.value, {
    damping: 0.4,
  })

  useLayoutEffect(() => {
    setSpringBtnCoords(btnCoords.value, {
      hard: true,
    })
  }, [Math.round(elementBound.width), Math.round(elementBound.width)])

  useEffectDeep(() => {
    setSpringBtnCoords(btnCoords.value)
  }, [btnCoords.value])

  const handleToggleInspect = () => {
    window.__kaioken?.emit(
      // @ts-expect-error We have our own custom type here
      "__kaiokenDevtoolsInsepctElementToggle",
      { name: "host" }
    )
    toggleElementToVnode.value = !toggleElementToVnode.value
  }

  return (
    <>
      <div
        ref={viewPortRef}
        className="w-full h-0 fixed top-0 left-0 z-[-9999] overflow-scroll pointer-events-none"
      />
      <div
        ref={btnContainerRef}
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
                  onclick={() => handleOpen()}
                  style={{ transform: `scale(${scale})`, opacity }}
                  className="transition text-white rounded-full p-1 hover:bg-[#0003]"
                >
                  <PageInfo width={16} height={16} />
                </button>
                <button
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
          ref={btnRef}
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
