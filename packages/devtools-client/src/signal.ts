import { signal } from "kaioken"

export const KeyboardMap = signal(
  new Map<
    string,
    {
      vNode: Kaioken.VNode
      setCollapsed: (value: Kaioken.StateSetter<boolean>) => void
    }
  >()
)

export const inspectComponent = signal<Kaioken.VNode | null>(null)
