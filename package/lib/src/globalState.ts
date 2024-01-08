import type { VNode } from "./types"
import {
  commitRoot,
  updateFunctionComponent,
  updateHostComponent,
} from "./dom.js"

export { g, type GlobalState }

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
      this.nextUnitOfWork = this.performUnitOfWork(this.nextUnitOfWork)
      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (!this.nextUnitOfWork && this.wipNode) {
      commitRoot(this)
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

  private performUnitOfWork(vNode: VNode): VNode | undefined {
    const isFunctionComponent = vNode.type instanceof Function
    if (isFunctionComponent) {
      updateFunctionComponent(this, vNode)
    } else {
      updateHostComponent(this, vNode)
    }
    if (vNode.child) {
      return vNode.child
    }
    let nextNode: VNode | undefined = vNode
    while (nextNode) {
      if (nextNode.sibling) {
        return nextNode.sibling
      }
      nextNode = nextNode.parent
    }
    return
  }
}

const g = new GlobalState()
