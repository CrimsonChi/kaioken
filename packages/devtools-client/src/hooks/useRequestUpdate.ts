import { useCurrentNode } from "kaioken"

export const useRequestUpdate = () => {
  const n = useCurrentNode()
  return () => n.ctx.requestUpdate(n)
}
