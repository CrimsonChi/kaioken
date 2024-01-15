import { Portal, StyleScope, Transition, useRef, useState } from "kaioken"

export function DrawerDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onclick={() => setOpen((v) => !v)}>Toggle Drawer</button>
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
  const offsetY = state === "entered" ? 0 : 100
  return (
    <StyleScope>
      <div
        ref={wrapperRef}
        className="drawer-wrapper test"
        onclick={(e) => e.target === wrapperRef.current && close()}
      >
        <div className="drawer-content">
          <h2>Drawer</h2>
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
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1000;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            transition: opacity 150ms ease-in-out;
            opacity: ${opacity};
          }
          .drawer-content {
            position: absolute;
            bottom: 0;
            left: 0;
            z-index: 1000;
            width: 100%;
            height: 50%;
            max-width: calc(100% - 40px);
            padding: 20px;
            background-color: #222;
            transition: transform 150ms ease-in-out;
            transform: translateY(${offsetY}%);
          }
        `}
      </style>
    </StyleScope>
  )
}
