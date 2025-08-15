import { type Signal } from "./index.js"

export type ReadonlySignal<T> = Signal<T> & {
  readonly value: T
}
export type SignalSubscriber<T = unknown> = (value: T, prevValue?: T) => void

export type SignalValues<T extends readonly Signal<unknown>[]> = {
  [I in keyof T]: T[I] extends Signal<infer V> ? V : never
}
