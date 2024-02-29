import { createStore } from "kaioken"

export const useCountStore = createStore(0, (set, get) => ({
  increment: () => set((state) => state + 1),
  decrement: () => set((state) => state - 1),
  add: (value: number) => {
    const newCount = get() + value
    set(newCount)
    return newCount
  },
  reset: () => set(0),
}))

// const { add } = useCountStore((store) => ({add: store.add}))

// const x = add(1)

export const useMessageStatsStore = createStore(
  { success: 0, fail: 0 },
  () => ({})
)

export type TodoItem = {
  id: string
  text: string
  done?: boolean
}

export const useTodosStore = createStore(
  [
    { id: "Asdasd", text: "buy coffee" },
    { id: "agdh", text: "walk the dog" },
  ] as TodoItem[],
  function (set) {
    return {
      addTodo: (text: string) =>
        set((prev) => [...prev, { id: crypto.randomUUID(), text }]),

      toggleTodo: (id: string) =>
        set((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item
          )
        ),
    }
  }
)
