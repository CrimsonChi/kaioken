import { DrawerDemo } from "./dialog/Drawer"
import { ModalDemo } from "./dialog/Modal"

export const Transitions = () => {
  return (
    <div className="flex gap-2">
      <ModalDemo />
      <DrawerDemo />
    </div>
  )
}
