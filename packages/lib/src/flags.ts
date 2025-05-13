export const flags = {
  // Set the flag at position `n` (0-based index)
  set(field: number, flag: number): number {
    return (field |= 1 << flag)
  },
  // Check if the flag at position `n` is set (true) or not (false)
  get(field: number, n: number): boolean {
    return (field & (1 << n)) !== 0
  },
  // Unset all flags between `start` and `end`
  unsetRange(field: number, start: number, end: number): number {
    const mask = ((1 << (end - start + 1)) - 1) << start
    return field & ~mask
  },
} as const
