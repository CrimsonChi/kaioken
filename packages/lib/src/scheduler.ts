import type { AppContext } from "./appContext"
import { Component } from "./component.js"
import { EffectTag, elementFreezeSymbol, elementTypes } from "./constants.js"
import { commitWork, createDom } from "./dom.js"
import { ctx, node } from "./globals.js"
import { reconcileChildren } from "./reconciler.js"
import { vNodeContains } from "./utils.js"

type VNode = Kaioken.VNode

export class Scheduler {
  private nextUnitOfWork: VNode | undefined = undefined
  private treesInProgress: VNode[] = []
  private currentTreeIndex = 0
  private timeoutRef: number = -1
  isRunning = false
  queuedNodeEffectSets: Function[][] = []
  nodeEffects: Function[] = []
  nextIdleEffects: Function[] = []
  deletions: VNode[] = []

  constructor(
    private appCtx: AppContext,
    private maxFrameMs = 50
  ) {}

  wake() {
    this.isRunning = true
    this.workLoop()
  }

  sleep() {
    this.isRunning = false
    if (this.timeoutRef !== -1) {
      clearTimeout(this.timeoutRef)
      this.timeoutRef = -1
    }
  }

  queueUpdate(node: VNode) {
    node.prev = { ...node, prev: undefined }

    if (this.nextUnitOfWork === undefined) {
      this.treesInProgress.push(node)
      this.nextUnitOfWork = node
      return
    } else if (this.nextUnitOfWork === node) {
      return
    }

    const treeIdx = this.treesInProgress.indexOf(node)
    // handle node as queued tree
    if (treeIdx !== -1) {
      if (treeIdx === this.currentTreeIndex) {
        this.treesInProgress[this.currentTreeIndex] = node
        this.nextUnitOfWork = node
      } else if (treeIdx < this.currentTreeIndex) {
        this.currentTreeIndex--
        this.treesInProgress.splice(treeIdx, 1)
        this.treesInProgress.push(node)
      }
      return
    }

    // handle node as child or parent of queued trees
    for (let i = 0; i < this.treesInProgress.length; i++) {
      if (vNodeContains(this.treesInProgress[i], node)) {
        if (i === this.currentTreeIndex) {
          // if req node is child of work node we can skip
          if (vNodeContains(this.nextUnitOfWork, node)) return
          // otherwise work node is a child of req node so we need to cancel & replace it
          this.nextUnitOfWork = node // jump back up the tree
        } else if (i < this.currentTreeIndex) {
          // already processed tree, create new tree with the node
          this.treesInProgress.push(node)
        }
        return
      } else if (vNodeContains(node, this.treesInProgress[i])) {
        if (i === this.currentTreeIndex) {
          // node contains current tree, replace it
          this.treesInProgress.splice(i, 1, node)
          this.nextUnitOfWork = node
        } else if (i < this.currentTreeIndex) {
          // node contains a tree that has already been processed
          this.currentTreeIndex--
          this.treesInProgress.splice(i, 1)
          this.treesInProgress.push(node)
        }
        return
      }
    }
    // node is not a child or parent of any queued trees, queue new tree
    this.treesInProgress.push(node)
  }

  queueDelete(node: VNode) {
    node.effectTag = EffectTag.DELETION
    if (node.props.ref) {
      node.props.ref.current = null
    }
    this.deletions.push(node)
  }

  queueCurrentNodeEffects() {
    this.queuedNodeEffectSets.push(this.nodeEffects)
    this.nodeEffects = []
  }

  nextIdle(fn: () => void) {
    this.nextIdleEffects.push(fn)
  }

  private workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    ctx.current = this.appCtx
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork =
        this.performUnitOfWork(this.nextUnitOfWork) ??
        this.treesInProgress[++this.currentTreeIndex]

      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (
      !this.nextUnitOfWork &&
      (this.deletions.length || this.treesInProgress.length)
    ) {
      while (this.deletions.length) {
        commitWork(this.appCtx, this.deletions.pop()!)
      }
      if (this.treesInProgress.length) {
        this.currentTreeIndex = 0
        while (this.treesInProgress.length) {
          commitWork(this.appCtx, this.treesInProgress.pop()!)
        }

        while (this.queuedNodeEffectSets.length) {
          const effects = this.queuedNodeEffectSets.pop()! // consume from child before parent
          while (effects.length) {
            effects.shift()!() // fire in sequence
          }
        }
      }
      window.__kaioken!.emit("update", this.appCtx)
    }

    if (!this.nextUnitOfWork) {
      while (this.nextIdleEffects.length) {
        this.nextIdleEffects.shift()!()
      }
    }

    if (!this.isRunning) return
    if ("requestIdleCallback" in window) {
      let didExec = false

      this.timeoutRef =
        (this.timeoutRef !== -1 && window.clearTimeout(this.timeoutRef),
        window.setTimeout(() => {
          if (!this.isRunning) return
          if (!didExec) {
            this.workLoop()
            didExec = true
          }
        }, this.maxFrameMs))

      window.requestIdleCallback((deadline) => {
        if (!this.isRunning) return
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
          if (!this.isRunning) return
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
    const frozen =
      elementFreezeSymbol in vNode && vNode[elementFreezeSymbol] === true
    const skip = frozen && vNode.effectTag !== EffectTag.PLACEMENT
    if (!skip) {
      try {
        if (Component.isCtor(vNode.type)) {
          this.updateClassComponent(vNode)
        } else if (vNode.type instanceof Function) {
          this.updateFunctionComponent(vNode)
        } else if (vNode.type === elementTypes.fragment) {
          vNode.child = reconcileChildren(
            this.appCtx,
            vNode,
            vNode.props.children
          )
        } else {
          this.updateHostComponent(vNode)
        }
      } catch (error) {
        console.error(error)
      }
      if (vNode.child) return vNode.child
    }

    let nextNode: VNode | undefined = vNode
    while (nextNode) {
      if (nextNode === this.treesInProgress[this.currentTreeIndex]) return
      if (nextNode.sibling) return nextNode.sibling
      nextNode = nextNode.parent
    }
  }

  private updateClassComponent(vNode: VNode) {
    this.appCtx.hookIndex = 0
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

    vNode.child = reconcileChildren(
      this.appCtx,
      vNode,
      [vNode.instance.render()].flat() as VNode[]
    )
    this.queueCurrentNodeEffects()
    node.current = undefined
  }

  private updateFunctionComponent(vNode: VNode) {
    this.appCtx.hookIndex = 0
    node.current = vNode
    vNode.child = reconcileChildren(
      this.appCtx,
      vNode,
      [(vNode.type as Function)(vNode.props)].flat()
    )
    this.queueCurrentNodeEffects()
    node.current = undefined
  }

  private updateHostComponent(vNode: VNode) {
    const dom = vNode.dom ?? createDom(vNode)
    if (vNode.props.ref) {
      vNode.props.ref.current = dom
    }
    vNode.child = reconcileChildren(this.appCtx, vNode, vNode.props.children)
  }
}
