import { Signal } from "./base.js"
import { effectQueue } from "./globals.js"

export function unwrap<T extends Signal<any> | unknown>(
  value: T
): T extends Signal<infer U> ? U : T {
  return Signal.isSignal(value) ? value.peek() : value
}

export const tick = () => {
  const keys = [...effectQueue.keys()]
  keys.forEach((id) => {
    const func = effectQueue.get(id)
    if (func) {
      func()
      effectQueue.delete(id)
    }
  })
}
