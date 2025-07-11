import type { Signal } from "./base.js"
import type { SignalSubscriber } from "./types.js"

export const tracking = {
  enabled: false,
  signals: new Map<string, Signal<any>>(),
  clear: function () {
    this.signals.clear()
  },
}
export const effectQueue = new Map<string, Function>()
export const signalSubsMap: Map<string, Set<SignalSubscriber>> = new Map()
