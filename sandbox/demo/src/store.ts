import { createStore } from "kaioken"

export const useCountStore = createStore({ count: 0 }, (set) => ({
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  add: (value: number) => set((state) => ({ count: state.count + value })),
  reset: () => set({ count: 0 }),
}))

export const useMessageStatsStore = createStore(
  { success: 0, fail: 0 },
  () => ({})
)
