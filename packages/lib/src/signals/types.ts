import { type Signal } from "./base"

export type ReadonlySignal<T> = Signal<T> & {
  readonly value: T
}
export interface SignalLike<T> {
  value: T
  peek(): T
  subscribe(callback: (value: T) => void): () => void
}
export type SignalSubscriber = Kaioken.VNode | Function

export type CleanupInstance = {
  call?(): void
}
