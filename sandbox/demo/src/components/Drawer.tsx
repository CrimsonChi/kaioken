import { Portal, StyleScope, Transition, useRef, useState } from "kaioken"
import { Button } from "./Button"

export function DrawerDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onclick={() => setOpen((v) => !v)}>Toggle Drawer</Button>
      <Portal container={document.getElementById("portal-root")!}>
        <Transition
          in={open}
          timings={[40, 150, 150, 150]}
          element={(state) => (
            <Drawer state={state} close={() => setOpen(false)} />
          )}
        />
      </Portal>
    </>
  )
}

type DrawerProps = {
  state: "entering" | "entered" | "exiting" | "exited"
  close: () => void
}

function Drawer({ state, close }: DrawerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  if (state == "exited") return null
  const opacity = state === "entered" ? 1 : 0
  const offsetY = state === "entered" ? 0 : 15
  return (
    <StyleScope>
      <div
        ref={wrapperRef}
        className="drawer-wrapper"
        onclick={(e) => e.target === wrapperRef.current && close()}
      >
        <div className="drawer-content">
          <h2 className="text-xl font-semibold pb-1 mb-2">Drawer</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam
            voluptatem, quas, quos, quod voluptate voluptates dolorum
            reprehenderit natus quibusdam ratione quia! Quisquam, quod. Quisquam
            voluptatem, quas, quos, quod voluptate voluptates dolorum
            reprehenderit natus quibusdam ratione quia! Quisquam, quod. Quisquam
            voluptatem, quas, quos, quod voluptate voluptates dolorum
            reprehenderit natus quibusdam ratione quia! Quisquam, quod.
          </p>
        </div>
      </div>
      <style>
        {`
          .drawer-wrapper {
            opacity: ${opacity};
          }
          .drawer-content {
            transform: translateY(${offsetY}%);
          }
        `}
      </style>
    </StyleScope>
  )
}
