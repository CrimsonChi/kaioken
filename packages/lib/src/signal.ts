import { signalSymbol } from "./constants.js"
import { node, renderMode } from "./globals.js"
import { useHook } from "./hooks/utils.js"
import { getVNodeAppContext } from "./utils.js"

export const signal = <T>(initial: T) => {
  return !node.current
    ? new Signal(initial)
    : useHook(
        "useSignal",
        { signal: undefined as any as Signal<T> },
        ({ hook, isInit }) => {
          if (isInit) {
            hook.signal = new Signal(initial)
            hook.debug = () => ({ value: hook.signal.value })
          }
          return hook.signal
        }
      )
}

export class Signal<T> {
  [signalSymbol] = true
  #value: T
  #subscribers = new Set<Kaioken.VNode | Function>()
  constructor(initial: T) {
    this.#value = initial
  }

  get value() {
    if (node.current) Signal.subscribeNode(node.current, this)
    return this.#value
  }

  set value(next: T) {
    this.#value = next
    this.notify()
  }

  toString() {
    if (node.current) Signal.subscribeNode(node.current, this)
    return `${this.#value}`
  }

  static isSignal(x: any): x is Signal<any> {
    return typeof x === "object" && !!x && signalSymbol in x
  }

  static subscribeNode(node: Kaioken.VNode, signal: Signal<any>) {
    if (renderMode.current !== "dom" && renderMode.current !== "hydrate") return
    if (!node.subs) node.subs = [signal]
    else if (node.subs.indexOf(signal) === -1) node.subs.push(signal)
    signal.#subscribers.add(node)
  }

  static unsubscribeNode(node: Kaioken.VNode, signal: Signal<any>) {
    signal.#subscribers.delete(node)
  }

  subscribe(cb: (state: T) => void) {
    this.#subscribers.add(cb)
    return () => this.#subscribers.delete(cb)
  }

  notify() {
    this.#subscribers.forEach((sub) => {
      if (sub instanceof Function) {
        return sub(this.#value)
      }
      getVNodeAppContext(sub).requestUpdate(sub)
    })
  }
}
