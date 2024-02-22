import { createStore } from "kaioken"

export const useCountStore = createStore({ count: 0 }, (set, get) => ({
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  add: (value: number) => {
    const newCount = get().count + value
    set({ count: newCount })
    return newCount
  },
  reset: () => set({ count: 0 }),
}))

// const { add } = useCountStore((store) => ({add: store.add}))

// const x = add(1)

export const useMessageStatsStore = createStore(
  { success: 0, fail: 0 },
  () => ({})
)
