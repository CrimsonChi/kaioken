import type { AppContext } from "./appContext"
import { Component } from "./component.js"
import { EffectTag, elementTypes as et } from "./constants.js"
import { commitWork, createDom, hydrateDom, updateDom } from "./dom.js"
import { ctx, node, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { assertValidElementProps } from "./props.js"
import { reconcileChildren } from "./reconciler.js"
import { applyRecursive, vNodeContains } from "./utils.js"

type VNode = Kaioken.VNode

export class Scheduler {
  private nextUnitOfWork: VNode | undefined = undefined
  private treesInProgress: VNode[] = []
  private currentTreeIndex = 0
  private isRunning = false
  private queuedNodeEffectSets: Function[][] = []
  private nextIdleEffects: Function[] = []
  private deletions: VNode[] = []
  private frameDeadline = 0
  private pendingCallback: IdleRequestCallback | undefined
  private channel: MessageChannel
  private frameHandle: number | null = null
  nodeEffects: Function[] = []

  constructor(
    private appCtx: AppContext<any>,
    private maxFrameMs = 50
  ) {
    const timeRemaining = () => this.frameDeadline - window.performance.now()
    const deadline = {
      didTimeout: false,
      timeRemaining,
    }
    this.channel = new MessageChannel()
    this.channel.port2.onmessage = () => {
      if (typeof this.pendingCallback === "function") {
        this.pendingCallback(deadline)
      }
    }
  }

  clear() {
    this.nextUnitOfWork = undefined
    this.treesInProgress = []
    this.currentTreeIndex = 0
    this.queuedNodeEffectSets = []
    this.nextIdleEffects = []
    this.deletions = []
    this.frameDeadline = 0
    this.pendingCallback = undefined
  }

  wake() {
    if (this.isRunning) return
    this.isRunning = true
    this.requestIdleCallback(this.workLoop.bind(this))
  }

  sleep() {
    if (!this.isRunning) return
    this.isRunning = false
    if (this.frameHandle !== null) {
      globalThis.cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }

  queueUpdate(node: VNode) {
    if (this.nextUnitOfWork === undefined) {
      this.treesInProgress.push(node)
      this.nextUnitOfWork = node
      return this.wake()
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
        } else {
          // node contains a tree that has not yet been processed, 'usurp' the tree
          this.treesInProgress.splice(i, 1, node)
        }
        return
      }
    }
    // node is not a child or parent of any queued trees, queue new tree
    this.treesInProgress.push(node)
  }

  queueDelete(node: VNode) {
    applyRecursive(
      node,
      (n) => {
        n.effectTag = EffectTag.DELETION
      },
      false
    )
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
      this.sleep()
      while (this.nextIdleEffects.length) {
        this.nextIdleEffects.shift()!()
      }
      return
    }

    this.requestIdleCallback(this.workLoop.bind(this))
  }

  private requestIdleCallback(callback: IdleRequestCallback) {
    this.frameHandle = globalThis.requestAnimationFrame((time) => {
      this.frameDeadline = time + this.maxFrameMs
      this.pendingCallback = callback
      this.channel.port1.postMessage(null)
    })
  }

  private performUnitOfWork(vNode: VNode): VNode | void {
    const frozen = "frozen" in vNode && vNode.frozen === true
    const skip = frozen && vNode.effectTag !== EffectTag.PLACEMENT
    if (!skip) {
      try {
        if (Component.isCtor(vNode.type)) {
          this.updateClassComponent(vNode)
        } else if (vNode.type instanceof Function) {
          this.updateFunctionComponent(vNode)
        } else if (vNode.type === et.fragment) {
          vNode.child =
            reconcileChildren(
              vNode,
              vNode.child || null,
              vNode.props.children || []
            ) || undefined
        } else {
          this.updateHostComponent(vNode)
        }
      } catch (error) {
        console.error(error)
      }
      if (vNode.child) {
        if (renderMode.current === "hydrate" && vNode.dom) {
          hydrationStack.push(vNode.dom)
        }
        return vNode.child
      }
    }

    let nextNode: VNode | undefined = vNode
    while (nextNode) {
      if (nextNode === this.treesInProgress[this.currentTreeIndex]) return
      if (nextNode.sibling) {
        return nextNode.sibling
      }

      nextNode = nextNode.parent
      if (renderMode.current === "hydrate" && nextNode?.dom) {
        hydrationStack.pop()
      }
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

    vNode.child =
      reconcileChildren(vNode, vNode.child || null, [
        vNode.instance.render(),
      ] as VNode[]) || undefined
    this.queueCurrentNodeEffects()
    node.current = undefined
  }

  private updateFunctionComponent(vNode: VNode) {
    this.appCtx.hookIndex = 0
    node.current = vNode
    vNode.child =
      reconcileChildren(vNode, vNode.child || null, [
        (vNode.type as Function)(vNode.props),
      ]) || undefined
    this.queueCurrentNodeEffects()
    node.current = undefined
  }

  private updateHostComponent(vNode: VNode) {
    assertValidElementProps(vNode)
    node.current = vNode
    if (!vNode.dom) {
      if (renderMode.current === "hydrate") {
        hydrateDom(vNode)
      } else {
        vNode.dom = createDom(vNode)
        updateDom(vNode)
      }
    }
    if (vNode.props.ref) {
      vNode.props.ref.current = vNode.dom
    }
    vNode.child =
      reconcileChildren(
        vNode,
        vNode.child || null,
        vNode.props.children || []
      ) || undefined
    node.current = undefined
  }
}
