import { ElementProps } from "kaioken"

export function ModalBackdrop({ children, ...props }: ElementProps<"div">) {
  return (
    <div {...props} className="modal-backdrop">
      {children}
    </div>
  )
}
