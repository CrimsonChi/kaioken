import type { Scheduler } from "./scheduler"
import type { MaybeDom, SomeDom } from "./types.dom"

const parentStack = [] as Array<SomeDom>
const childIdxStack = [] as Array<number>
const eventDeferrals = [] as Array<Function>

export const hydrationStack = {
  clear: () => {
    parentStack.length = 0
    childIdxStack.length = 0
  },
  pop: () => {
    parentStack.pop()
    childIdxStack.pop()
  },
  push: (el: SomeDom) => {
    parentStack.push(el)
    childIdxStack.push(0)
  },
  nextChild: () => {
    return parentStack[parentStack.length - 1].childNodes[
      childIdxStack[childIdxStack.length - 1]++
    ] as MaybeDom
  },
  captureEvents: (element: Element, scheduler: Scheduler) => {
    toggleEvtListeners(element, true)
    scheduler.nextIdle(() => {
      toggleEvtListeners(element, false)
      while (eventDeferrals.length) eventDeferrals.shift()!()
    })
  },
}

const captureEvent = (e: Event) => {
  const t = e.target
  if (!e.isTrusted || !t) return
  eventDeferrals.push(() => t.dispatchEvent(e))
}
const toggleEvtListeners = (element: Element, value: boolean) => {
  for (const key in element) {
    if (key.startsWith("on")) {
      const eventType = key.substring(2)
      element[value ? "addEventListener" : "removeEventListener"](
        eventType,
        captureEvent,
        { passive: true }
      )
    }
  }
}
