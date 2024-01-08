export function createSignal<T>(initial: T) {
  let value = initial
  const listeners = new Set<(value: T) => void>()
  const signal = {
    get value() {
      return value
    },
    set value(next: T) {
      value = next
      listeners.forEach((listener) => listener(value))
    },
    subscribe(listener: (value: T) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return signal
}
