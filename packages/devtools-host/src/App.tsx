import * as kaioken from "kaioken"
import { twMerge } from "tailwind-merge"
import { Flame } from "./icon/Flame"
import { useAnchorPos } from "./hooks/useAnchorPos"
import { useEffectDeep, useSpring } from "@kaioken-core/hooks"
import {
  useSignal,
  Transition,
  useEffect,
  useLayoutEffect,
  useRef,
} from "kaioken"
import { useDevTools } from "./hooks/useDevtools"
import { InspectComponent } from "./components/InspectComponent"
import { PageInfo } from "./icon/PageInfo"
import { SquareMouse } from "./icon/SquareMouse"
import { toggleElementToVnode } from "./store"
import { broadcastChannel } from "devtools-shared"

const handleToggleInspect = () => {
  toggleElementToVnode.value = !toggleElementToVnode.value
  broadcastChannel.send({
    type: "set-inspect-enabled",
    value: toggleElementToVnode.value,
  })
}

export default function App() {
  const toggled = useSignal(false)
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

  const springBtnCoords = useSpring(anchorCoords.value, {
    damping: 0.4,
  })

  useLayoutEffect(() => {
    if (isMounted.current === false) {
      springBtnCoords.set(anchorCoords.value, {
        hard: true,
      })
    }

    isMounted.current = true
  }, [])

  useEffectDeep(() => {
    springBtnCoords.set(anchorCoords.value)
  }, [anchorCoords.value])

  useEffect(() => {
    if (toggled.value) {
      updateAnchorPos()
    }
  }, [toggled.value, updateAnchorPos])

  return (
    <>
      <div
        ref={viewPortRef}
        className="w-full h-0 fixed top-0 left-0 z-[-9999] overflow-scroll pointer-events-none"
      />
      <div
        ref={anchorRef}
        draggable
        className={`flex ${isHorizontalSnap ? "flex-col" : ""} ${
          toggled.value ? "rounded-3xl" : "rounded-full"
        } p-1 gap-1 items-center will-change-transform bg-crimson`}
        style={{
          transform: `translate3d(${Math.round(
            springBtnCoords.value.x
          )}px, ${Math.round(springBtnCoords.value.y)}px, 0)`,
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
                  onclick={handleOpen}
                  style={{ transform: `scale(${scale})`, opacity }}
                  className="transition text-white rounded-full p-1 hover:bg-[#0003]"
                >
                  <PageInfo width={16} height={16} />
                </button>
                <button
                  title="Toggle Component Inspection"
                  onclick={handleToggleInspect}
                  style={{ transform: `scale(${scale})`, opacity }}
                  className={`transition text-white rounded-full p-1 hover:bg-[#0003] ${
                    toggleElementToVnode.value ? "bg-[#0003]" : ""
                  }`}
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
