import type { VNode } from "./types"
import { commitWork, createDom } from "./dom.js"
import { EffectTag } from "./constants.js"

export { g, type GlobalState }

class GlobalState {
  rootNode: VNode | undefined = undefined
  curNode: VNode | undefined = undefined
  wipNode: VNode | undefined = undefined
  nextUnitOfWork: VNode | undefined = undefined

  hookIndex = 0
  deletions: VNode[] = []
  pendingEffects: Function[] = []
  updateDeferrals: VNode[] = []

  mounted = false

  mount(node: VNode, container: HTMLElement) {
    this.rootNode = node
    this.rootNode.dom = container
    this.wipNode = this.rootNode
    this.deletions = []
    this.nextUnitOfWork = this.wipNode
    this.mounted = true
    this.workLoop()
    return this.rootNode
  }

  requestUpdate(node: VNode, forceUpdate = false) {
    if (node.effectTag === EffectTag.DELETION) return

    if (forceUpdate) {
      if (node === this.wipNode) return
      // remove from deferrals if it's there
      const idx = this.updateDeferrals.indexOf(node)
      idx > -1 && this.updateDeferrals.splice(idx, 1)
      // if we have a wipNode, defer it
      this.wipNode && this.updateDeferrals.push(this.wipNode)
    } else if (this.isWorking()) {
      if (!this.updateDeferrals.includes(node) && node !== this.wipNode) {
        this.updateDeferrals.push(node)
      }
      return
    }

    this.wipNode = node
    this.wipNode.prev = { ...node, prev: undefined }

    this.nextUnitOfWork = this.wipNode
  }

  queueEffect(callback: Function) {
    this.pendingEffects.push(callback)
  }

  isWorking() {
    return (
      !!this.wipNode || !!this.nextUnitOfWork || this.updateDeferrals.length > 0
    )
  }

  private workLoop(deadline?: IdleDeadline) {
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

    if (!this.nextUnitOfWork && this.updateDeferrals.length) {
      this.requestUpdate(this.updateDeferrals.shift()!)
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
          effectTag: EffectTag.UPDATE,
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
}

const g = new GlobalState()
