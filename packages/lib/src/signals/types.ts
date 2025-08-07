import { type Signal } from "./base"

export type ReadonlySignal<T> = Signal<T> & {
  readonly value: T
}
export type SignalSubscriber = Kiru.VNode | Function

export type SignalValues<T extends readonly Signal<unknown>[]> = {
  [I in keyof T]: T[I] extends Signal<infer V> ? V : never
}
