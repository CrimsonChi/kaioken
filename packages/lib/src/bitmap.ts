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

// // Example usage:
// const bitmap = new Bitmap()

// // Set flag 2 (binary: 00000100)
// bitmap.setFlag(2)

// // Check if flag 2 is set (true)
// console.log(bitmap.isFlagSet(2)) // Output: true

// // Clear flag 2 (binary: 00000000)
// bitmap.clearFlag(2)
// console.log(bitmap.isFlagSet(2)) // Output: false

// // Toggle flag 1 (binary: 00000010)
// bitmap.toggleFlag(1)
// console.log(bitmap.getFlags()) // Output: 2 (binary: 00000010)

// // Toggle flag 1 again (back to 0)
// bitmap.toggleFlag(1)
// console.log(bitmap.getFlags()) // Output: 0
