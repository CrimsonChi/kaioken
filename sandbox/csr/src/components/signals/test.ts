import { signal } from "kaioken"

export { count, todo }

const count = signal(0)
count.displayName = "count"
const todo = signal<string[]>([])
todo.displayName = "todo"
