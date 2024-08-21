import { twMerge } from "tailwind-merge"
import { Flame } from "./icon/Flame"
import { useBtnPos } from "./hooks/useBtnPos"
import { useEffectDeep, useSpring } from "@kaioken-core/hooks"
import { useLayoutEffect } from "kaioken"
import { useDevTools } from "./hooks/useDevtools"

export default function App() {
  const handleOpen = useDevTools()
  const { btnCoords, btnRef, viewPortRef, startMouse, elementBound } =
    useBtnPos()

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

  return (
    <>
      <div
        ref={viewPortRef}
        className="w-full h-0 fixed top-0 left-0 z-[-9999] overflow-scroll pointer-events-none"
      />
      <button
        className={twMerge(
          "bg-crimson rounded-[50%] p-1 will-change-transform",
          startMouse.value && "pointer-events-none"
        )}
        onclick={handleOpen}
        tabIndex={-1}
        ref={btnRef}
        style={{
          transform: `translate3d(${Math.round(springBtnCoords.x)}px, ${Math.round(springBtnCoords.y)}px, 0)`,
        }}
      >
        <Flame />
      </button>
    </>
  )
}
