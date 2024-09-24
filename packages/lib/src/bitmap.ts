type VNode = Kaioken.VNode

export const bitmapOps = {
  // Set the flag at position `n` (0-based index)
  setFlag(vNode: VNode, n: number): void {
    vNode.flags |= 1 << n
  },
  // Clear the flag at position `n`
  clearFlag(vNode: VNode, n: number): void {
    vNode.flags &= ~(1 << n)
  },
  // Toggle the flag at position `n`
  toggleFlag(vNode: VNode, n: number): void {
    vNode.flags ^= 1 << n
  },
  // Check if the flag at position `n` is set (true) or not (false)
  isFlagSet(vNode: VNode, n: number): boolean {
    return (vNode.flags & (1 << n)) !== 0
  },
  // Optional: Get the current bitmap state (for debugging or tracking purposes)
  getFlags(vNode: VNode): string {
    return vNode.flags.toString(2).padStart(8, "0")
  },
} as const
