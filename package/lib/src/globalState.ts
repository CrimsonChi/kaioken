import type { VNode } from "./types"
import { commitWork, createDom, domMap } from "./dom.js"
import { EffectTag } from "./constants.js"

export { g, type GlobalState }

class GlobalState {
  rootNode: VNode | undefined = undefined
  curNode: VNode | undefined = undefined
  nextUnitOfWork: VNode | undefined = undefined
  treesInProgress: VNode[] = []
  currentTreeIndex = 0

  hookIndex = 0
  deletions: VNode[] = []
  pendingEffects: Function[] = []

  mounted = false

  mount(node: VNode, container: HTMLElement) {
    this.rootNode = node
    domMap.set(node, container)
    this.requestUpdate(node)
    this.deletions = []
    this.mounted = true
    this.workLoop()
    return this.rootNode
  }

  requestUpdate(node: VNode) {
    if (!this.vNodeContains(this.rootNode!, node)) return
    if (this.isNodeBeingWorkedOn(node)) {
      const dt = performance.now()
      if (node.dt && dt >= node.dt) return // stale update request
      node.dt = dt
      return
    }
    if (node.effectTag === EffectTag.DELETION) return

    if (!node.prev || node.prev?.prev) node.prev = { ...node, prev: undefined }

    node.dt = performance.now()
    this.treesInProgress.push(node)
    if (!this.nextUnitOfWork) this.nextUnitOfWork = node
    return
  }

  queueEffect(callback: Function) {
    this.pendingEffects.push(callback)
  }

  private workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork = this.performUnitOfWork(this.nextUnitOfWork)
      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (!this.nextUnitOfWork) {
      this.nextUnitOfWork = this.treesInProgress[++this.currentTreeIndex]
    }

    if (!this.nextUnitOfWork && this.treesInProgress.length) {
      this.currentTreeIndex = 0
      this.deletions.forEach((d) => commitWork(this, d))
      this.deletions = []
      for (let i = 0; i < this.treesInProgress.length; i++) {
        commitWork(this, this.treesInProgress[i])
      }
      while (this.pendingEffects.length) this.pendingEffects.shift()?.()
      this.treesInProgress = []
    }

    requestIdleCallback(this.workLoop.bind(this))
  }

  private performUnitOfWork(vNode: VNode): VNode | undefined {
    const isFunctionComponent = vNode.type instanceof Function
    if (isFunctionComponent) {
      this.updateFunctionComponent(vNode)
    } else {
      this.updateHostComponent(vNode)
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

  private updateFunctionComponent(vNode: VNode) {
    vNode.hooks = []
    this.hookIndex = 0
    this.curNode = vNode

    const children = [(vNode.type as Function)(vNode.props)].flat()
    this.reconcileChildren(vNode, children)
  }

  private updateHostComponent(vNode: VNode) {
    const dom = domMap.get(vNode) ?? createDom(vNode)
    if (vNode.props.ref) {
      vNode.props.ref.current = dom
    }
    this.reconcileChildren(vNode, vNode.props.children)
  }

  private reconcileChildren(vNode: VNode, children: VNode[]) {
    let index = 0
    let oldNode: VNode | undefined = vNode.prev && vNode.prev.child
    let prevSibling: VNode | undefined = undefined

    while (index < children.length || oldNode) {
      const child = children[index]
      let newNode = undefined

      const sameType = oldNode && child && child.type == oldNode.type

      if (sameType && oldNode) {
        newNode = oldNode
        newNode.props = child.props
        newNode.parent = vNode
        newNode.effectTag = EffectTag.UPDATE
      }
      if (child && !sameType) {
        newNode = {
          type: child.type,
          props: child.props,
          parent: vNode,
          prev: undefined,
          effectTag: EffectTag.PLACEMENT,
          hooks: [],
        }
      }
      if (oldNode && !sameType) {
        oldNode.effectTag = EffectTag.DELETION
        if (oldNode.props.ref) {
          oldNode.props.ref.current = null
        }
        this.deletions.push(oldNode)
      }

      if (oldNode) {
        oldNode = oldNode.sibling
      }

      if (index === 0) {
        vNode.child = newNode
      } else if (prevSibling) {
        prevSibling.sibling = newNode
      }

      prevSibling = newNode
      index++
    }
  }

  private isNodeBeingWorkedOn(node: VNode) {
    return this.treesInProgress.some((d) => this.vNodeContains(d, node))
  }

  private vNodeContains(parent: VNode, node: VNode) {
    if (parent === node) return true
    if (parent.child && this.vNodeContains(parent.child, node)) return true
    if (parent.sibling && this.vNodeContains(parent.sibling, node)) return true
    return false
  }
}

const g = new GlobalState()
