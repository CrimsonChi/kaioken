import { signal } from "kaioken"

export const count = signal(0)
export const todo = signal<string[]>([])
