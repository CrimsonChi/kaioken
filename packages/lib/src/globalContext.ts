import { EffectTag } from "./constants.js"
import { contexts, ctx, nodeToCtxMap } from "./globals.js"
import { Scheduler } from "./scheduler.js"
import { vNodeContains } from "./utils.js"

export { GlobalContext }
export type { GlobalContextOptions }

type VNode = Kaioken.VNode

interface GlobalContextOptions {
  root: HTMLElement
  /**
   * Sets the maximum render refresh time.
   * @default 50
   */
  maxFrameMs?: number
}

class GlobalContext {
  scheduler: Scheduler
  rootNode: VNode | undefined = undefined
  hookIndex = 0

  constructor(options?: GlobalContextOptions) {
    contexts.add(this)
    this.scheduler = new Scheduler(this, options?.maxFrameMs ?? 50)
  }

  mount(node: VNode, container: HTMLElement) {
    this.rootNode = node
    nodeToCtxMap.set(this.rootNode, ctx.current)

    node.dom = container
    this.scheduler.queueUpdate(node)
    this.scheduler.workLoop()
    return this.rootNode
  }

  requestUpdate(node: VNode) {
    if (node.effectTag === EffectTag.DELETION) return
    if (!vNodeContains(this.rootNode!, node)) return
    return this.scheduler.queueUpdate(node)
  }

  requestDelete(node: VNode) {
    if (node.effectTag === EffectTag.DELETION) return
    this.scheduler.queueDelete(node)
  }

  queueEffect(callback: Function) {
    this.scheduler.nodeEffects.push(callback)
  }
}
