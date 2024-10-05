import { useSyncExternalStore } from "kaioken"
const myStore = new (class<T> {
  #subscribers: Set<() => void>
  #value: T
  constructor(initial: T) {
    this.#value = initial
    this.#subscribers = new Set()
  }
  subscribe(callback: () => void) {
    this.#subscribers.add(callback)
    return () => this.#subscribers.delete(callback)
  }
  set(next: T) {
    this.#value = next
    this.#subscribers.forEach((fn) => fn())
  }
  get() {
    return this.#value
  }
})(0)

export default function UseSyncExternalStoreExample() {
  const value = useSyncExternalStore(
    (cb) => myStore.subscribe(cb),
    () => myStore.get()
  )
  return (
    <div>
      <h4>UseSyncExternalStoreExample</h4>
      <p>{value}</p>
      <button onclick={() => myStore.set(myStore.get() + 1)}>Increment</button>
    </div>
  )
}
