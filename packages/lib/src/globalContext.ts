import { commitWork, createDom } from "./dom.js"
import { EffectTag, elementTypes } from "./constants.js"
import { Component } from "./component.js"

export { GlobalContext, ctx, node, nodeToContextMap, contexts }
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
  rootNode: VNode | undefined = undefined
  nextUnitOfWork: VNode | void = undefined
  treesInProgress: VNode[] = []
  currentTreeIndex = 0
  maxFrameMs = 50
  timeoutRef: number = -1

  hookIndex = 0
  deletions: VNode[] = []
  pendingEffects: Function[] = []

  constructor(options?: GlobalContextOptions) {
    this.maxFrameMs = options?.maxFrameMs ?? 50
    contexts.add(this)
  }

  mount(node: VNode, container: HTMLElement) {
    this.rootNode = node
    nodeToContextMap.set(this.rootNode, ctx.current)

    node.dom = container
    this.requestUpdate(node)
    this.workLoop()
    return this.rootNode
  }

  requestUpdate(node: VNode) {
    if (!this.vNodeContains(this.rootNode!, node)) return
    if (node.effectTag === EffectTag.DELETION) return
    if (this.isNodeBeingWorkedOn(node)) {
      const dt = performance.now()
      if (node.dt && dt >= node.dt) return // stale update request
      node.dt = dt
      return
    }

    if (!node.prev || node.prev?.prev) node.prev = { ...node, prev: undefined }

    node.dt = performance.now()
    this.treesInProgress.push(node)
    if (!this.nextUnitOfWork) this.nextUnitOfWork = node
  }

  queueEffect(callback: Function) {
    this.pendingEffects.push(callback)
  }

  applyRecursive(func: (node: VNode) => void) {
    const apply = (node: VNode) => {
      func(node)
      if (node.child) apply(node.child)
      if (node.sibling) apply(node.sibling)
    }
    apply(this.rootNode!)
  }

  private workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    ctx.current = this
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork =
        this.performUnitOfWork(this.nextUnitOfWork) ??
        this.treesInProgress[++this.currentTreeIndex]
      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
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
    if ("requestIdleCallback" in window) {
      let didExec = false
      if (this.timeoutRef !== -1) {
        window.clearTimeout(this.timeoutRef)
        this.timeoutRef = -1
      }
      this.timeoutRef = window.setTimeout(() => {
        if (!didExec) {
          this.workLoop()
          didExec = true
        }
      }, this.maxFrameMs)
      window.requestIdleCallback((deadline) => {
        if (!didExec) {
          this.workLoop(deadline)
          didExec = true
        }
      })
    } else {
      const w = window as Window
      w.requestAnimationFrame(() => {
        const start = performance.now()
        window.setTimeout(() => {
          const elapsed = performance.now() - start
          const deadline: IdleDeadline = {
            didTimeout: false,
            timeRemaining: function () {
              return Math.max(0, 50 - elapsed) // Simulate 50ms max idle time
            },
          }
          this.workLoop(deadline)
        }, 0)
      })
    }
  }

  private performUnitOfWork(vNode: VNode): VNode | void {
    if (Component.isCtor(vNode.type)) {
      this.updateClassComponent(vNode)
    } else if (
      vNode.type instanceof Function ||
      vNode.type === elementTypes.fragment
    ) {
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
  }

  private updateClassComponent(vNode: VNode) {
    this.hookIndex = 0
    node.current = vNode
    if (!vNode.instance) {
      const instance =
        vNode.prev?.instance ??
        new (vNode.type as { new (props: Record<string, unknown>): Component })(
          vNode.props
        )
      vNode.instance = instance
    } else {
      vNode.instance.props = vNode.props
    }

    const children = [vNode.instance.render()].flat() as VNode[]
    this.reconcileChildren(vNode, children)
  }

  private updateFunctionComponent(vNode: VNode) {
    this.hookIndex = 0
    node.current = vNode
    const children =
      vNode.type instanceof Function
        ? [(vNode.type as Function)(vNode.props)].flat()
        : vNode.props.children.flat()

    this.reconcileChildren(vNode, children)
  }

  private updateHostComponent(vNode: VNode) {
    const dom = vNode.dom ?? createDom(vNode)
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
      let newNode: VNode | undefined = undefined

      const sameType = oldNode && child && child.type == oldNode.type

      if (sameType && oldNode) {
        newNode = oldNode
        newNode.props = child.props
        newNode.parent = vNode
        newNode.effectTag = EffectTag.UPDATE
        nodeToContextMap.set(newNode, ctx.current)
      }
      if (child && !sameType) {
        newNode = {
          type: child.type,
          props: child.props,
          parent: vNode,
          effectTag: EffectTag.PLACEMENT,
        }
        nodeToContextMap.set(newNode, ctx.current)
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

const nodeToContextMap = new WeakMap<Kaioken.VNode, GlobalContext>()
const contexts = new Set<GlobalContext>()

const node = {
  current: undefined as Kaioken.VNode | undefined,
}

const ctx = {
  current: undefined as unknown as GlobalContext,
}
