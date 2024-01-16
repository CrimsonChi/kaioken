import { Portal, Transition, useRef, useState } from "kaioken"
import { Button } from "./atoms/Button"

export function ModalDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onclick={() => setOpen((v) => !v)}>Toggle Modal</Button>
      <Portal container={document.getElementById("portal-root")!}>
        <Transition
          in={open}
          timings={[40, 150, 150, 150]}
          element={(state) => (
            <Modal state={state} close={() => setOpen(false)} />
          )}
        />
      </Portal>
    </>
  )
}

type ModalProps = {
  state: "entering" | "entered" | "exiting" | "exited"
  close: () => void
}

function Modal({ state, close }: ModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  if (state == "exited") return null
  const opacity = state === "entered" ? "1" : "0"
  const scale = state === "entered" ? 1 : 0.85
  const translateY = state === "entered" ? -50 : -75
  return (
    <div
      ref={wrapperRef}
      className="modal-wrapper"
      onclick={(e) => e.target === wrapperRef.current && close()}
      style={{ opacity }}
    >
      <div
        className="modal-content"
        style={{
          transform: `translate(-50%, ${translateY}%) scale(${scale})`,
        }}
      >
        <h2 className="text-xl font-semibold">Modal</h2>
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
  )
}
