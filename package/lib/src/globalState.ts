import type { VNode } from "./types"
import { commitWork, createDom } from "./dom.js"

export { g, type GlobalState }

class GlobalState {
  curNode: VNode | undefined = undefined
  wipNode: VNode | undefined = undefined
  hookIndex = 0
  deletions: VNode[] = []
  pendingEffects: Function[] = []

  nextUnitOfWork: VNode | undefined = undefined
  mounted = false

  mount(node: VNode, container: HTMLElement) {
    this.wipNode = node
    this.wipNode.dom = container
    this.deletions = []
    this.nextUnitOfWork = this.wipNode
    this.mounted = true
    this.workLoop()
    return node
  }

  workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork = this.performUnitOfWork(this.nextUnitOfWork)
      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (!this.nextUnitOfWork && this.wipNode) {
      this.deletions.forEach((d) => commitWork(this, d))
      commitWork(this, this.wipNode)
      while (this.pendingEffects.length) this.pendingEffects.shift()?.()
      this.wipNode = undefined
    }

    if (!this.mounted) this.mounted = true
    requestIdleCallback(this.workLoop.bind(this))
  }

  setWipNode(node: VNode) {
    this.wipNode = node
    this.wipNode.prev = { ...node, prev: undefined }

    this.nextUnitOfWork = this.wipNode
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
    if (!vNode.dom) {
      vNode.dom = createDom(vNode)
    }
    if (vNode.props.ref) {
      vNode.props.ref.current = vNode.dom
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

      if (sameType) {
        const old = oldNode as VNode
        newNode = {
          type: old.type,
          props: child.props,
          dom: old!.dom,
          parent: vNode,
          prev: { ...old, prev: undefined },
          effectTag: "UPDATE",
          hooks: old!.hooks,
        }
      }
      if (child && !sameType) {
        newNode = {
          type: child.type,
          props: child.props,
          dom: undefined,
          parent: vNode,
          prev: undefined,
          effectTag: "PLACEMENT",
          hooks: [],
        }
      }
      if (oldNode && !sameType) {
        oldNode.effectTag = "DELETION"
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
}

const g = new GlobalState()
