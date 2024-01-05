import type { VNode } from "./types"
import { commitRoot, performUnitOfWork } from "./dom.js"

class GlobalState {
  curNode: VNode | undefined = undefined
  wipNode: VNode | undefined = undefined
  hookIndex = 0
  deletions: VNode[] = []
  pendingEffects: Function[] = []

  nextUnitOfWork: VNode | undefined = undefined
  mounted = false

  workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork = performUnitOfWork(this.nextUnitOfWork)
      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (!this.nextUnitOfWork && this.wipNode) {
      commitRoot()
    }

    if (!this.mounted) this.mounted = true
    requestIdleCallback(this.workLoop.bind(this))
  }

  setWipNode(node: VNode) {
    this.wipNode = {
      dom: node.child?.dom,
      type: node.type,
      props: node.props,
      prev: node,
      hooks: [],
      parent: node.parent,
    }
    this.nextUnitOfWork = this.wipNode
    this.deletions = []
  }
}

export const globalState = new GlobalState()
