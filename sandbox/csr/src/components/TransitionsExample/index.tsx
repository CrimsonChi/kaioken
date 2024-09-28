import { DrawerDemo } from "./Drawer"
import { ModalDemo } from "./Modal"

export const TransitionsExample = () => {
  return (
    <div className="flex gap-2">
      <ModalDemo />
      <DrawerDemo />
    </div>
  )
}
