import { useRef, type TransitionState, useEffect } from "kaioken"
import { ModalBackdrop } from "./ModalBackdrop"
import "./Modal.css"

type ModalProps = {
  state: TransitionState
  close: () => void
  children?: JSX.Element[]
}

export function Modal({ state, close, children }: ModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  if (state == "exited") return null
  const opacity = state === "entered" ? "1" : "0"
  const scale = state === "entered" ? 1 : 0.85
  const translateY = state === "entered" ? -50 : -25

  useEffect(() => {
    window.addEventListener("keyup", handleKeyPress)
    return () => window.removeEventListener("keyup", handleKeyPress)
  }, [])

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault()
      if (state === "exited") return
      close()
    }
  }

  return (
    <ModalBackdrop
      ref={wrapperRef}
      onclick={(e) => e.target === wrapperRef.current && close()}
      style={{ opacity }}
    >
      <div
        className="modal-content p-4"
        style={{
          transform: `translate(-50%, ${translateY}%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </ModalBackdrop>
  )
}
