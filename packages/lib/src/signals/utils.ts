import { Signal } from "./base.js"
import { effectQueue } from "./globals.js"

export function unwrap<T extends Signal<any> | unknown>(
  value: T
): T extends Signal<infer U> ? U : T {
  return Signal.isSignal(value)
    ? value.peek()
    : (value as T extends Signal<infer U> ? U : T)
}

export const tick = () => {
  effectQueue.forEach((fn) => fn())
  effectQueue.clear()
}
