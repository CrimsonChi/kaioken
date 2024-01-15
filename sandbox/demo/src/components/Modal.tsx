import { Portal, StyleScope, Transition, useRef, useState } from "kaioken"

export function ModalDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onclick={() => setOpen((v) => !v)}>Toggle Modal</button>
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
  const opacity = state === "entered" ? 1 : 0
  const scale = state === "entered" ? 1 : 0.85
  return (
    <StyleScope>
      <div
        ref={wrapperRef}
        className="modal-wrapper"
        onclick={(e) => e.target === wrapperRef.current && close()}
      >
        <div className="modal-content">
          <h2>Modal</h2>
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
          .modal-wrapper {
            opacity: ${opacity};
          }
          .modal-content {
            transform: translate(-50%, -50%) scale(${scale});
          }
        `}
      </style>
    </StyleScope>
  )
}
